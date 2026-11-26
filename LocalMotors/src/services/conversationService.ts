import { getAccessToken } from './auth/getAccessToken';
import {
  MAX_MESSAGE_LENGTH,
  type ChatMessage,
  type Conversation,
  type ListConversationsResponse,
  type ListMessagesResponse,
  type MarkConversationAsReadResponse,
} from '../types/conversation';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function requireApiUrl(): string {
  if (!API_URL) {
    throw new Error('VITE_API_URL não está configurada.');
  }
  return API_URL;
}

function normalizeConversation(conversation: Conversation): Conversation {
  const rawUnread = typeof conversation.unreadCount === 'number' ? conversation.unreadCount : 0;
  return {
    ...conversation,
    unreadCount: Number.isFinite(rawUnread) ? Math.max(0, rawUnread) : 0,
  };
}

export class ConversationApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ConversationApiError';
    this.status = status;
  }
}

async function authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new ConversationApiError('Sua sessão expirou. Entre novamente para acessar suas conversas.', 401);
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${requireApiUrl()}${path}`, { ...init, headers });
  } catch {
    throw new ConversationApiError(
      'Não foi possível conectar ao servidor de conversas. Verifique sua conexão.',
      0
    );
  }

  const body = (await response.json().catch(() => ({}))) as { message?: string };

  if (!response.ok) {
    const defaultMsg =
      response.status === 401
        ? 'Sessão expirada ou não autenticada.'
        : response.status === 403
          ? 'Você não tem permissão para acessar esta conversa.'
          : response.status === 404
            ? 'Conversa ou anúncio não encontrado.'
            : response.status >= 500
              ? 'Erro interno no servidor ao processar a solicitação de conversa.'
              : `Falha na comunicação com o servidor (${response.status}).`;
    throw new ConversationApiError(body.message || defaultMsg, response.status);
  }

  return body as T;
}

export async function createOrGetConversation(vehicleId: string): Promise<Conversation> {
  if (!vehicleId || !vehicleId.trim()) {
    throw new ConversationApiError('Anúncio inválido para iniciar conversa.', 400);
  }
  const conversation = await authenticatedRequest<Conversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ vehicleId: vehicleId.trim() }),
  });
  return normalizeConversation(conversation);
}

export async function listConversationsWithSummary(): Promise<{
  items: Conversation[];
  totalUnreadCount: number;
}> {
  const data = await authenticatedRequest<ListConversationsResponse>('/conversations');
  const items = Array.isArray(data.items) ? data.items.map(normalizeConversation) : [];
  const computedUnread = items.reduce(
    (sum, item) => sum + Math.max(0, item.unreadCount ?? 0),
    0
  );
  const totalUnreadCount =
    typeof data.totalUnreadCount === 'number' && Number.isFinite(data.totalUnreadCount)
      ? Math.max(0, data.totalUnreadCount)
      : computedUnread;

  return { items, totalUnreadCount };
}

export async function listConversations(): Promise<Conversation[]> {
  const { items } = await listConversationsWithSummary();
  return items;
}

export async function listConversationMessages(
  conversationId: string,
  cursor?: string,
  limit = 50
): Promise<ListMessagesResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set('cursor', cursor);
  }
  const data = await authenticatedRequest<ListMessagesResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`
  );
  return {
    ...data,
    conversation: normalizeConversation(data.conversation),
  };
}

export async function sendConversationMessage(
  conversationId: string,
  text: string
): Promise<ChatMessage> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ConversationApiError('Digite uma mensagem antes de enviar.', 400);
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new ConversationApiError(
      `A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`,
      400
    );
  }

  return authenticatedRequest<ChatMessage>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ text: trimmed }),
    }
  );
}

export async function markConversationAsRead(
  conversationId: string
): Promise<MarkConversationAsReadResponse> {
  if (!conversationId || !conversationId.trim()) {
    throw new ConversationApiError('Conversa inválida para marcar como lida.', 400);
  }

  return authenticatedRequest<MarkConversationAsReadResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/read`,
    {
      method: 'PATCH',
    }
  );
}
