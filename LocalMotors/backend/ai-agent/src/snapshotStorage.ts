/**
 * src/snapshotStorage.ts
 * Implementa SnapshotStorage do Strands SDK usando DynamoDB.
 * Permite que o agente persista o histórico de conversas entre invocações Lambda.
 *
 * Tabela: AI_CHAT_SNAPSHOTS_TABLE
 * PK: SESSION#<sessionId>#<scope>#<scopeId>
 * SK: 'latest' (snapshot mutável) | <uuid-v7> (snapshot imutável) | 'manifest'
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  SnapshotStorage,
  SnapshotLocation,
  Snapshot,
  SnapshotManifest,
} from '@strands-agents/sdk';
import { config } from './config.js';

const LATEST_KEY = 'latest';
const MANIFEST_KEY = 'manifest';
const DELETE_BATCH_SIZE = 25;

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function buildPk(location: SnapshotLocation): string {
  return `SESSION#${location.sessionId}#${location.scope}#${location.scopeId}`;
}

function snapshotTtl(): number {
  return Math.floor(Date.now() / 1000) + config.snapshotTtlSeconds;
}

export class DynamoSnapshotStorage implements SnapshotStorage {
  async saveSnapshot(params: {
    location: SnapshotLocation;
    snapshotId: string;
    isLatest: boolean;
    snapshot: Snapshot;
  }): Promise<void> {
    const pk = buildPk(params.location);
    const sk = params.isLatest ? LATEST_KEY : params.snapshotId;

    await dynamo.send(
      new PutCommand({
        TableName: config.snapshotsTable,
        Item: {
          pk,
          sk,
          data: JSON.stringify(params.snapshot),
          updatedAt: new Date().toISOString(),
          ttl: snapshotTtl(),
        },
      }),
    );
  }

  async loadSnapshot(params: {
    location: SnapshotLocation;
    snapshotId?: string;
  }): Promise<Snapshot | null> {
    const pk = buildPk(params.location);
    const sk = params.snapshotId ?? LATEST_KEY;

    const result = await dynamo.send(
      new GetCommand({
        TableName: config.snapshotsTable,
        Key: { pk, sk },
      }),
    );

    if (!result.Item?.['data']) return null;

    try {
      return JSON.parse(result.Item['data'] as string) as Snapshot;
    } catch {
      console.error('[DynamoSnapshotStorage] Falha ao parsear snapshot:', { pk, sk });
      return null;
    }
  }

  async listSnapshotIds(params: {
    location: SnapshotLocation;
    limit?: number;
    startAfter?: string;
  }): Promise<string[]> {
    if (params.limit !== undefined && params.limit <= 0) return [];

    const pk = buildPk(params.location);

    const result = await dynamo.send(
      new QueryCommand({
        TableName: config.snapshotsTable,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': pk },
        ProjectionExpression: 'sk',
      }),
    );

    let ids = (result.Items ?? [])
      .map((item) => item['sk'])
      .filter(
        (sk): sk is string =>
          typeof sk === 'string' && sk !== LATEST_KEY && sk !== MANIFEST_KEY,
      )
      .sort();

    if (params.startAfter) {
      const startAfter = params.startAfter;
      ids = ids.filter((id) => id > startAfter);
    }

    if (params.limit !== undefined) {
      ids = ids.slice(0, params.limit);
    }

    return ids;
  }

  async deleteSession(params: { sessionId: string }): Promise<void> {
    const prefix = `SESSION#${params.sessionId}#`;
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const page = await dynamo.send(
        new ScanCommand({
          TableName: config.snapshotsTable,
          FilterExpression: 'begins_with(pk, :prefix)',
          ExpressionAttributeValues: { ':prefix': prefix },
          ProjectionExpression: 'pk, sk',
          ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
        }),
      );

      const items = page.Items ?? [];

      for (let i = 0; i < items.length; i += DELETE_BATCH_SIZE) {
        const batch = items.slice(i, i + DELETE_BATCH_SIZE).flatMap((item) => {
          const pk = item['pk'];
          const sk = item['sk'];
          if (typeof pk !== 'string' || typeof sk !== 'string') return [];
          return [{ DeleteRequest: { Key: { pk, sk } } }];
        });

        if (batch.length === 0) continue;

        let pending: typeof batch = batch;
        for (let attempt = 0; attempt < 3 && pending.length > 0; attempt += 1) {
          const response = await dynamo.send(
            new BatchWriteCommand({
              RequestItems: {
                [config.snapshotsTable]: pending,
              },
            }),
          );

          pending = (response.UnprocessedItems?.[
            config.snapshotsTable
          ] ?? []) as typeof batch;
        }

        if (pending.length > 0) {
          console.error(
            '[DynamoSnapshotStorage] Itens não removidos após retentativas:',
            { count: pending.length },
          );
        }
      }

      exclusiveStartKey = page.LastEvaluatedKey as
        | Record<string, unknown>
        | undefined;
    } while (exclusiveStartKey);
  }

  async loadManifest(params: {
    location: SnapshotLocation;
  }): Promise<SnapshotManifest> {
    const pk = buildPk(params.location);

    const result = await dynamo.send(
      new GetCommand({
        TableName: config.snapshotsTable,
        Key: { pk, sk: MANIFEST_KEY },
      }),
    );

    const data = result.Item?.['data'];
    if (typeof data !== 'string') {
      return {
        schemaVersion: '1.0',
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const parsed = JSON.parse(data) as Partial<SnapshotManifest>;
      if (
        typeof parsed.schemaVersion !== 'string' ||
        typeof parsed.updatedAt !== 'string'
      ) {
        throw new Error('Manifest inválido');
      }
      return {
        schemaVersion: parsed.schemaVersion,
        updatedAt: parsed.updatedAt,
      };
    } catch {
      console.error('[DynamoSnapshotStorage] Falha ao parsear manifest:', { pk });
      return {
        schemaVersion: '1.0',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async saveManifest(params: {
    location: SnapshotLocation;
    manifest: SnapshotManifest;
  }): Promise<void> {
    const pk = buildPk(params.location);

    await dynamo.send(
      new PutCommand({
        TableName: config.snapshotsTable,
        Item: {
          pk,
          sk: MANIFEST_KEY,
          data: JSON.stringify(params.manifest),
          updatedAt: new Date().toISOString(),
        },
      }),
    );
  }
}
