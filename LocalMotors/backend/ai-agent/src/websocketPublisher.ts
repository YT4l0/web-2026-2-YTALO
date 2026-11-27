/**
 * src/websocketPublisher.ts
 * Envia respostas JSON de volta ao cliente via API Gateway Management API.
 */
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { deleteConnection } from './connectionRepository.js';
import type { OutgoingMessage } from './types/index.js';

let cachedClient: ApiGatewayManagementApiClient | null = null;
let cachedEndpoint = '';

function getClient(endpoint: string): ApiGatewayManagementApiClient {
  if (!cachedClient || cachedEndpoint !== endpoint) {
    cachedClient = new ApiGatewayManagementApiClient({ endpoint });
    cachedEndpoint = endpoint;
  }
  return cachedClient;
}

export async function sendToConnection(
  endpoint: string,
  connectionId: string,
  payload: OutgoingMessage,
): Promise<void> {
  const client = getClient(endpoint);
  const data = Buffer.from(JSON.stringify(payload), 'utf8');

  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: data,
      }),
    );
  } catch (err) {
    const statusCode = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    const name = (err as Error)?.name ?? '';

    if (name === 'GoneException' || statusCode === 410) {
      // Conexão expirada — remove silenciosamente
      try {
        await deleteConnection(connectionId);
      } catch {
        // Ignora falha de limpeza
      }
      return;
    }

    console.warn('[websocketPublisher] Falha ao enviar resposta:', { name, statusCode });
    throw err;
  }
}
