import { getAccessToken } from './auth/getAccessToken';
import {
  MAX_MESSAGE_LENGTH,
  type ChatMessage,
  type Conversation,
  type ListMessagesResponse,
} from '../types/conversation';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function requireApiUrl(): string {
  if (!API_URL) {
    throw new Error('VITE_API_URL não está configurada.');
  }
  return API_URL;
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

  const response = await fetch(`${requireApiUrl()}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => ({}))) as { message?: string };

  if (!response.ok) {
    const defaultMsg =
      response.status === 401
        ? 'Sessão expirada ou não autenticada.'
        : response.status === 403
          ? 'Você não tem permissão para acessar esta conversa.'
          : response.status === 404
            ? 'Conversa ou anúncio não encontrado.'
            : `Falha na comunicação com o servidor (${response.status}).`;
    throw new ConversationApiError(body.message || defaultMsg, response.status);
  }

  return body as T;
}

export async function createOrGetConversation(vehicleId: string): Promise<Conversation> {
  if (!vehicleId || !vehicleId.trim()) {
    throw new ConversationApiError('Anúncio inválido para iniciar conversa.', 400);
  }
  return authenticatedRequest<Conversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ vehicleId: vehicleId.trim() }),
  });
}

export async function listConversations(): Promise<Conversation[]> {
  const data = await authenticatedRequest<{ items: Conversation[]; count: number }>('/conversations');
  return data.items || [];
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
  return authenticatedRequest<ListMessagesResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`
  );
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
