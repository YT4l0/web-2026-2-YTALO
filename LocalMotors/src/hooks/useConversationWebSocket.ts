import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../services/auth/getAccessToken';
import type {
  ChatMessage,
  ConversationSocketEvent,
  ConversationSocketStatus,
} from '../types/conversation';

const RAW_WS_URL = (import.meta.env.VITE_CONVERSATIONS_WEBSOCKET_URL || '').trim();
const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.messageId) &&
    isNonEmptyString(value.conversationId) &&
    isNonEmptyString(value.senderId) &&
    typeof value.senderName === 'string' &&
    typeof value.text === 'string' &&
    isNonEmptyString(value.createdAt)
  );
}

function parseConversationSocketEvent(raw: unknown): ConversationSocketEvent | null {
  if (!isRecord(raw) || typeof raw.type !== 'string') {
    return null;
  }

  if (raw.type === 'CONNECTED') {
    return { type: 'CONNECTED' };
  }

  if (raw.type === 'NEW_MESSAGE') {
    if (
      !isNonEmptyString(raw.conversationId) ||
      !isNonEmptyString(raw.recipientId) ||
      !isChatMessage(raw.message)
    ) {
      return null;
    }

    let conversationSummary:
      | {
          lastMessageText: string;
          lastMessageAt: string;
          lastMessageSenderId: string;
        }
      | undefined;

    if (isRecord(raw.conversation)) {
      if (
        typeof raw.conversation.lastMessageText === 'string' &&
        isNonEmptyString(raw.conversation.lastMessageAt) &&
        isNonEmptyString(raw.conversation.lastMessageSenderId)
      ) {
        conversationSummary = {
          lastMessageText: raw.conversation.lastMessageText,
          lastMessageAt: raw.conversation.lastMessageAt,
          lastMessageSenderId: raw.conversation.lastMessageSenderId,
        };
      }
    }

    return {
      type: 'NEW_MESSAGE',
      conversationId: raw.conversationId,
      recipientId: raw.recipientId,
      message: raw.message,
      conversation: conversationSummary,
    };
  }

  if (raw.type === 'MESSAGE_READ') {
    if (
      !isNonEmptyString(raw.conversationId) ||
      !isNonEmptyString(raw.readBy) ||
      !isNonEmptyString(raw.readAt)
    ) {
      return null;
    }
    return {
      type: 'MESSAGE_READ',
      conversationId: raw.conversationId,
      readBy: raw.readBy,
      readAt: raw.readAt,
    };
  }

  return null;
}

interface UseConversationWebSocketOptions {
  enabled: boolean;
  userId: string | null;
  onEvent: (event: ConversationSocketEvent) => void;
}

export function useConversationWebSocket({
  enabled,
  userId,
  onEvent,
}: UseConversationWebSocketOptions): { status: ConversationSocketStatus } {
  const [status, setStatus] = useState<ConversationSocketStatus>(() =>
    RAW_WS_URL ? 'disconnected' : 'disabled'
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef<number>(0);
  const intentionalCloseRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const connectingRef = useRef<boolean>(false);
  const devMissingUrlLoggedRef = useRef<boolean>(false);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const closeCurrentSocket = useCallback(
    (intentional: boolean) => {
      clearReconnectTimer();
      intentionalCloseRef.current = intentional;
      connectingRef.current = false;

      const current = wsRef.current;
      wsRef.current = null;
      if (current) {
        current.onopen = null;
        current.onmessage = null;
        current.onerror = null;
        current.onclose = null;
        if (
          current.readyState === WebSocket.OPEN ||
          current.readyState === WebSocket.CONNECTING
        ) {
          current.close(1000, intentional ? 'Client closed' : 'Reconnect');
        }
      }
    },
    [clearReconnectTimer]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      closeCurrentSocket(true);
    };
  }, [closeCurrentSocket]);

  useEffect(() => {
    if (!RAW_WS_URL) {
      if (import.meta.env.DEV && !devMissingUrlLoggedRef.current) {
        devMissingUrlLoggedRef.current = true;
        console.info(
          '[ConversationsWS] VITE_CONVERSATIONS_WEBSOCKET_URL não configurada. Operando via API HTTP.'
        );
      }
      closeCurrentSocket(true);
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setStatus('disabled');
        }
      }, 0);
      return () => clearTimeout(timer);
    }

    if (!enabled || !userId) {
      closeCurrentSocket(true);
      attemptRef.current = 0;
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setStatus('disconnected');
        }
      }, 0);
      return () => clearTimeout(timer);
    }

    let effectActive = true;

    const connect = async (isReconnect: boolean) => {
      if (!effectActive || !isMountedRef.current) return;
      if (connectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      connectingRef.current = true;
      setStatus(isReconnect ? 'reconnecting' : 'connecting');

      try {
        const token = await getAccessToken();
        if (!effectActive || !isMountedRef.current) {
          connectingRef.current = false;
          return;
        }

        if (!token) {
          connectingRef.current = false;
          setStatus('disconnected');
          return;
        }

        let wsUrl: URL;
        try {
          wsUrl = new URL(RAW_WS_URL);
        } catch {
          connectingRef.current = false;
          if (import.meta.env.DEV) {
            console.warn('[ConversationsWS] VITE_CONVERSATIONS_WEBSOCKET_URL inválida.');
          }
          setStatus('error');
          return;
        }

        wsUrl.searchParams.set('token', token);

        intentionalCloseRef.current = false;
        const socket = new WebSocket(wsUrl.toString());
        wsRef.current = socket;

        socket.onopen = () => {
          connectingRef.current = false;
          if (!effectActive || !isMountedRef.current) {
            socket.close(1000, 'Unmounted');
            return;
          }
          attemptRef.current = 0;
          setStatus('connected');
        };

        socket.onmessage = (messageEvent) => {
          if (!effectActive || !isMountedRef.current) return;
          if (typeof messageEvent.data !== 'string') return;

          let parsedJson: unknown;
          try {
            parsedJson = JSON.parse(messageEvent.data);
          } catch {
            return;
          }

          const validEvent = parseConversationSocketEvent(parsedJson);
          if (validEvent) {
            onEventRef.current(validEvent);
          }
        };

        socket.onerror = () => {
          if (!effectActive || !isMountedRef.current) return;
          setStatus('error');
        };

        socket.onclose = () => {
          connectingRef.current = false;
          if (wsRef.current === socket) {
            wsRef.current = null;
          }
          if (!effectActive || !isMountedRef.current || intentionalCloseRef.current) {
            return;
          }

          const delay =
            RECONNECT_DELAYS_MS[Math.min(attemptRef.current, RECONNECT_DELAYS_MS.length - 1)];
          attemptRef.current += 1;
          setStatus('reconnecting');

          clearReconnectTimer();
          reconnectTimerRef.current = setTimeout(() => {
            if (effectActive && isMountedRef.current && !intentionalCloseRef.current) {
              void connect(true);
            }
          }, delay);
        };
      } catch {
        connectingRef.current = false;
        if (!effectActive || !isMountedRef.current || intentionalCloseRef.current) {
          return;
        }
        const delay =
          RECONNECT_DELAYS_MS[Math.min(attemptRef.current, RECONNECT_DELAYS_MS.length - 1)];
        attemptRef.current += 1;
        setStatus('reconnecting');
        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          if (effectActive && isMountedRef.current && !intentionalCloseRef.current) {
            void connect(true);
          }
        }, delay);
      }
    };

    const startTimer = setTimeout(() => {
      void connect(false);
    }, 0);

    return () => {
      effectActive = false;
      clearTimeout(startTimer);
      closeCurrentSocket(true);
    };
  }, [enabled, userId, clearReconnectTimer, closeCurrentSocket]);

  return { status };
}
