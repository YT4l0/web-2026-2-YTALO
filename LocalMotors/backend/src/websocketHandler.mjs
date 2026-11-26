import { deleteConnection, saveConnection } from './connectionsRepository.mjs';
import { verifyCognitoToken } from './tokenVerifier.mjs';

const CONNECTION_TTL_SECONDS = 24 * 60 * 60;

async function handleConnect(event) {
  const connectionId = event.requestContext?.connectionId;
  if (!connectionId) {
    return { statusCode: 400, body: 'Missing connectionId' };
  }

  const token = event.queryStringParameters?.token;
  if (typeof token !== 'string' || !token.trim()) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  let verified;
  try {
    verified = await verifyCognitoToken(token);
  } catch {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const nowMs = Date.now();
  const connectedAt = new Date(nowMs).toISOString();
  const expiresAt = Math.floor(nowMs / 1000) + CONNECTION_TTL_SECONDS;

  await saveConnection({
    connectionId,
    userId: verified.sub,
    connectedAt,
    expiresAt,
  });

  return { statusCode: 200, body: 'Connected' };
}

async function handleDisconnect(event) {
  const connectionId = event.requestContext?.connectionId;
  if (connectionId) {
    await deleteConnection(connectionId);
  }
  return { statusCode: 200, body: 'Disconnected' };
}

function handleDefault() {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Unsupported route' }),
  };
}

export async function handler(event) {
  const routeKey = event.requestContext?.routeKey;

  try {
    if (routeKey === '$connect') {
      return await handleConnect(event);
    }
    if (routeKey === '$disconnect') {
      return await handleDisconnect(event);
    }
    if (routeKey === '$default') {
      return handleDefault();
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Unknown route' }),
    };
  } catch (err) {
    console.error('[websocketHandler] Erro interno:', {
      routeKey,
      name: err?.name,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}
