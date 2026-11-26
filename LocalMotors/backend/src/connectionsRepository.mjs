import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function getConnectionsTable() {
  return (process.env.CONNECTIONS_TABLE || '').trim();
}

function getConnectionsUserIndex() {
  return (process.env.CONNECTIONS_USER_INDEX || 'userId-index').trim();
}

/**
 * Salva uma conexão WebSocket ativa vinculada ao sub do usuário.
 */
export async function saveConnection({ connectionId, userId, connectedAt, expiresAt }) {
  const tableName = getConnectionsTable();
  if (!tableName) {
    throw new Error('CONNECTIONS_TABLE não configurada.');
  }

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        connectionId,
        userId,
        connectedAt,
        expiresAt,
      },
    })
  );
}

/**
 * Remove uma conexão WebSocket (operação idempotente).
 */
export async function deleteConnection(connectionId) {
  const tableName = getConnectionsTable();
  if (!tableName || !connectionId) {
    return;
  }

  await ddb.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { connectionId },
    })
  );
}

/**
 * Lista todas as conexões ativas de um usuário usando o GSI userId-index.
 */
export async function getConnectionsByUserId(userId) {
  const tableName = getConnectionsTable();
  if (!tableName || !userId) {
    return [];
  }

  const indexName = getConnectionsUserIndex();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const connections = [];
  let exclusiveStartKey;

  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      })
    );

    for (const item of result.Items || []) {
      if (item.connectionId && (!item.expiresAt || item.expiresAt > nowSeconds)) {
        connections.push(item);
      }
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return connections;
}
