import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { deleteConnection, getConnectionsByUserId } from './connectionsRepository.mjs';

let cachedClient = null;
let cachedEndpoint = '';

function getManagementClient() {
  const endpoint = (process.env.WEBSOCKET_API_ENDPOINT || '').trim();
  if (!endpoint) {
    return null;
  }
  if (!cachedClient || cachedEndpoint !== endpoint) {
    cachedClient = new ApiGatewayManagementApiClient({ endpoint });
    cachedEndpoint = endpoint;
  }
  return cachedClient;
}

/**
 * Publica um evento JSON para todas as conexões WebSocket ativas de um usuário.
 * Remove conexões expiradas (GoneException / HTTP 410) e nunca propaga erro fatal
 * para não desfazer operações já persistidas na Lambda HTTP.
 */
export async function publishEventToUser(userId, eventPayload) {
  try {
    const client = getManagementClient();
    if (!client) {
      console.warn('[WebSocketPublisher] WEBSOCKET_API_ENDPOINT ausente; publicação ignorada.');
      return;
    }

    if (!userId || !eventPayload || typeof eventPayload.type !== 'string') {
      return;
    }

    const connections = await getConnectionsByUserId(userId);
    if (!connections.length) {
      return;
    }

    const data = Buffer.from(JSON.stringify(eventPayload), 'utf8');

    await Promise.allSettled(
      connections.map(async ({ connectionId }) => {
        try {
          await client.send(
            new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: data,
            })
          );
        } catch (err) {
          const statusCode = err?.$metadata?.httpStatusCode;
          if (err?.name === 'GoneException' || statusCode === 410) {
            try {
              await deleteConnection(connectionId);
            } catch (deleteErr) {
              console.warn('[WebSocketPublisher] Falha ao remover conexão expirada:', {
                name: deleteErr?.name,
              });
            }
            return;
          }

          console.warn('[WebSocketPublisher] Falha ao enviar evento para conexão:', {
            type: eventPayload.type,
            name: err?.name,
            statusCode,
          });
        }
      })
    );
  } catch (err) {
    console.warn('[WebSocketPublisher] Erro não fatal ao publicar evento:', {
      type: eventPayload?.type,
      name: err?.name,
    });
  }
}
