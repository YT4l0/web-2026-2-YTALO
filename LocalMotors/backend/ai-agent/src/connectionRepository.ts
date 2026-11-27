/**
 * src/connectionRepository.ts
 * Gerencia conexões WebSocket do chat de IA no DynamoDB.
 * Tabela: AI_CHAT_CONNECTIONS_TABLE
 * Chave: connectionId (String, partition key)
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from './config.js';
import type { Connection } from './types/index.js';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function saveConnection(conn: Connection): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: config.connectionsTable,
      Item: {
        connectionId: conn.connectionId,
        userId: conn.userId,
        connectedAt: conn.connectedAt,
        expiresAt: conn.expiresAt,
      },
    }),
  );
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await dynamo.send(
    new DeleteCommand({
      TableName: config.connectionsTable,
      Key: { connectionId },
    }),
  );
}

/**
 * Busca a conexão pelo connectionId (PK da tabela).
 * Retorna null quando a conexão não existe (expirada ou já removida).
 */
export async function getConnection(
  connectionId: string,
): Promise<Connection | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: config.connectionsTable,
      Key: { connectionId },
    }),
  );

  if (!result.Item) return null;

  const userId = result.Item['userId'];
  if (typeof userId !== 'string' || !userId) return null;

  return {
    connectionId,
    userId,
    connectedAt:
      typeof result.Item['connectedAt'] === 'string'
        ? result.Item['connectedAt']
        : '',
    expiresAt:
      typeof result.Item['expiresAt'] === 'number'
        ? result.Item['expiresAt']
        : 0,
  };
}

/**
 * Busca todas as conexões ativas de um usuário via GSI userId-index.
 * Requer que a tabela tenha um GSI com PK=userId.
 */
export async function getConnectionsByUserId(userId: string): Promise<Connection[]> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: config.connectionsTable,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }),
  );
  return (result.Items ?? []) as Connection[];
}
