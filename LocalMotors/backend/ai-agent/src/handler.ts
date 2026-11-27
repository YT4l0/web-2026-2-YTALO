/**
 * src/handler.ts
 * Handler Lambda para a API Gateway WebSocket do chat de IA do MotorLocal.
 *
 * Rotas:
 *   $connect    — autentica o Access Token do Cognito e salva a conexão
 *   $disconnect — remove a conexão
 *   $default    — processa a mensagem e responde via WebSocket
 *   sendMessage — alias explícito tratado como $default
 *
 * Contrato com o frontend (useChatSocket.ts / ChatWidget.tsx):
 *   Recebe: { "message": "texto do usuário", "sessionId"?: "default" }
 *   Envia:  { "type": "answer" | "error", "text": "resposta" }
 *
 * sessionId:
 *   - Opcional; padrão "default".
 *   - Regex: ^[a-zA-Z0-9_-]+$
 *   - Máximo 100 caracteres.
 *   - A memória é isolada por userId (sub do Cognito) + sessionId.
 */
import { verifyAccessToken } from './tokenVerifier.js';
import {
  saveConnection,
  deleteConnection,
  getConnection,
} from './connectionRepository.js';
import { sendToConnection } from './websocketPublisher.js';
import { createAgentForUser } from './agent.js';
import { config } from './config.js';
import type {
  WsEvent,
  WsResponse,
  IncomingMessage,
  OutgoingMessage,
} from './types/index.js';

const MAX_MESSAGE_LENGTH = 1000;
const DEFAULT_SESSION_ID = 'default';
const SESSION_ID_MAX_LENGTH = 100;
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

const SAFE_ERRORS = {
  invalidMessage: 'Mensagem inválida ou muito longa (máximo 1000 caracteres).',
  expiredSession: 'Sessão expirada. Recarregue a página e tente novamente.',
  agentFailure: 'Erro ao processar sua mensagem. Tente novamente em instantes.',
  emptyAnswer: 'Não consegui gerar uma resposta agora. Tente reformular a pergunta.',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deriva o endpoint de gerenciamento do WebSocket a partir do próprio evento.
 * A variável AI_CHAT_WEBSOCKET_ENDPOINT é opcional e, quando definida, tem
 * precedência.
 */
function resolveEndpoint(event: WsEvent): string {
  const configured = config.websocketEndpointOptional;
  if (configured) return configured;

  const { domainName, stage } = event.requestContext;
  return `https://${domainName}/${stage}`;
}

async function sendError(
  endpoint: string,
  connectionId: string,
  text: string,
): Promise<void> {
  const payload: OutgoingMessage = { type: 'error', text };
  await sendToConnection(endpoint, connectionId, payload).catch(() => {
    // O cliente pode ter desconectado; não há o que fazer além de seguir.
  });
}

/**
 * Valida e normaliza o sessionId enviado pelo cliente.
 * - Deve conter apenas [a-zA-Z0-9_-]
 * - Máximo 100 caracteres
 * - Padrão "default" quando ausente ou vazio
 * Retorna null se o valor enviado é inválido (não vazio mas fora da regex).
 */
function parseSessionId(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_SESSION_ID;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return DEFAULT_SESSION_ID;
  }
  if (trimmed.length > SESSION_ID_MAX_LENGTH) {
    return null;
  }
  if (!SESSION_ID_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function parseIncomingMessage(rawBody: string | null | undefined): (IncomingMessage & { validatedSessionId: string }) | null {
  if (typeof rawBody !== 'string' || !rawBody.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const message = record['message'];
  if (typeof message !== 'string') return null;

  const sessionId = parseSessionId(record['sessionId']);
  if (sessionId === null) {
    // sessionId fornecido mas inválido
    return null;
  }

  const incoming: IncomingMessage & { validatedSessionId: string } = {
    message: message.trim(),
    validatedSessionId: sessionId,
  };

  if (sessionId !== DEFAULT_SESSION_ID) {
    incoming.sessionId = sessionId;
  }

  return incoming;
}

// ─── $connect ─────────────────────────────────────────────────────────────────

async function handleConnect(event: WsEvent): Promise<WsResponse> {
  const connectionId = event.requestContext.connectionId;

  const token = event.queryStringParameters?.['token'];
  if (typeof token !== 'string' || !token.trim()) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  let verified: { sub: string };
  try {
    verified = await verifyAccessToken(token);
  } catch {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const nowMs = Date.now();
  await saveConnection({
    connectionId,
    userId: verified.sub,
    connectedAt: new Date(nowMs).toISOString(),
    expiresAt: Math.floor(nowMs / 1000) + config.connectionTtlSeconds,
  });

  return { statusCode: 200, body: 'Connected' };
}

// ─── $disconnect ──────────────────────────────────────────────────────────────

async function handleDisconnect(event: WsEvent): Promise<WsResponse> {
  const connectionId = event.requestContext.connectionId;

  try {
    await deleteConnection(connectionId);
  } catch (err) {
    // A conexão já pode ter sido removida (Gone/expiração). Não falha a rota.
    console.warn('[handler] Falha ao remover conexão:', {
      name: err instanceof Error ? err.name : 'UnknownError',
    });
  }

  return { statusCode: 200, body: 'Disconnected' };
}

// ─── $default / sendMessage ───────────────────────────────────────────────────

async function handleDefault(event: WsEvent): Promise<WsResponse> {
  const connectionId = event.requestContext.connectionId;
  const endpoint = resolveEndpoint(event);

  const incoming = parseIncomingMessage(event.body);
  if (!incoming) {
    await sendError(endpoint, connectionId, SAFE_ERRORS.invalidMessage);
    return { statusCode: 400, body: 'Bad Request' };
  }

  if (!incoming.message || incoming.message.length > MAX_MESSAGE_LENGTH) {
    await sendError(endpoint, connectionId, SAFE_ERRORS.invalidMessage);
    return { statusCode: 400, body: 'Bad Request' };
  }

  // O $connect validou o token e vinculou o userId ao connectionId.
  let connection: Awaited<ReturnType<typeof getConnection>>;
  try {
    connection = await getConnection(connectionId);
  } catch (err) {
    console.error('[handler] Falha ao consultar conexão:', {
      name: err instanceof Error ? err.name : 'UnknownError',
    });
    await sendError(endpoint, connectionId, SAFE_ERRORS.expiredSession);
    return { statusCode: 500, body: 'Internal Server Error' };
  }

  if (!connection) {
    await sendError(endpoint, connectionId, SAFE_ERRORS.expiredSession);
    return { statusCode: 401, body: 'Unauthorized' };
  }

  // Memória isolada por userId (sub do Cognito) + sessionId validado.
  // Assim dois usuários com o mesmo sessionId nunca compartilham memória.
  const { userId } = connection;
  const { validatedSessionId } = incoming;

  let responseText: string;
  try {
    const agent = createAgentForUser(userId, validatedSessionId);
    const result = await agent.invoke(incoming.message);
    responseText = result.toString().trim();
  } catch (err) {
    console.error('[handler] Erro ao invocar o agente:', {
      name: err instanceof Error ? err.name : 'UnknownError',
    });
    await sendError(endpoint, connectionId, SAFE_ERRORS.agentFailure);
    return { statusCode: 500, body: 'Internal Server Error' };
  }

  if (!responseText) {
    await sendError(endpoint, connectionId, SAFE_ERRORS.emptyAnswer);
    return { statusCode: 200, body: 'OK' };
  }

  const answerPayload: OutgoingMessage = {
    type: 'answer',
    text: responseText,
  };

  try {
    await sendToConnection(endpoint, connectionId, answerPayload);
  } catch (err) {
    console.error('[handler] Falha ao enviar resposta:', {
      name: err instanceof Error ? err.name : 'UnknownError',
    });
    return { statusCode: 500, body: 'Internal Server Error' };
  }

  return { statusCode: 200, body: 'OK' };
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────

export async function handler(event: WsEvent): Promise<WsResponse> {
  const routeKey = event.requestContext?.routeKey;

  try {
    if (routeKey === '$connect') return await handleConnect(event);
    if (routeKey === '$disconnect') return await handleDisconnect(event);
    // $default é a rota catch-all do API Gateway WebSocket.
    // sendMessage é uma rota nomeada alternativa — tratada identicamente.
    if (routeKey === '$default' || routeKey === 'sendMessage') {
      return await handleDefault(event);
    }

    return { statusCode: 400, body: 'Unknown route' };
  } catch (err) {
    console.error('[handler] Erro não tratado:', {
      routeKey,
      name: err instanceof Error ? err.name : 'UnknownError',
    });
    return { statusCode: 500, body: 'Internal Server Error' };
  }
}