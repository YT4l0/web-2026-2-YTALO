import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useConversationWebSocket } from '../hooks/useConversationWebSocket';
import {
  ConversationApiError,
  listConversationsWithSummary,
  markConversationAsRead,
} from '../services/conversationService';
import type {
  ChatMessage,
  Conversation,
  ConversationSocketEvent,
  ConversationSocketStatus,
  NewMessageEvent,
} from '../types/conversation';

type MessageListener = (event: NewMessageEvent) => void;

export interface ConversationsContextValue {
  conversations: Conversation[];
  totalUnreadCount: number;
  socketStatus: ConversationSocketStatus;
  isLoadingConversations: boolean;
  conversationsError: string | null;
  refreshConversations: () => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  setActiveConversationId: (conversationId: string | null) => void;
  upsertConversation: (conversation: Conversation) => void;
  updateConversationPreview: (conversationId: string, message: ChatMessage) => void;
  registerMessageListener: (listener: MessageListener) => () => void;
}

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

function computeTotalUnread(list: Conversation[]): number {
  return list.reduce((sum, conv) => sum + Math.max(0, conv.unreadCount ?? 0), 0);
}

function sortConversationsByRecent(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const ConversationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnreadOverride, setTotalUnreadOverride] = useState<number | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const listenersRef = useRef<Set<MessageListener>>(new Set());
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const activeConversationIdRef = useRef<string | null>(null);
  const prevSocketStatusRef = useRef<ConversationSocketStatus>('disabled');
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const totalUnreadCount = useMemo(() => {
    if (!isAuthenticated) return 0;
    if (totalUnreadOverride !== null) {
      return Math.max(0, totalUnreadOverride);
    }
    return computeTotalUnread(conversations);
  }, [isAuthenticated, totalUnreadOverride, conversations]);

  useEffect(() => {
    if (isAuthenticated && totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) MotorLocal`;
    } else {
      document.title = 'MotorLocal';
    }
  }, [isAuthenticated, totalUnreadCount]);

  useEffect(() => {
    return () => {
      document.title = 'MotorLocal';
    };
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setConversations([]);
      setTotalUnreadOverride(null);
      setConversationsError(null);
      return;
    }

    setIsLoadingConversations(true);
    setConversationsError(null);

    try {
      const { items, totalUnreadCount: summaryUnread } = await listConversationsWithSummary();
      if (!isMountedRef.current) return;

      const sorted = sortConversationsByRecent(items);
      setConversations(sorted);
      setTotalUnreadOverride(summaryUnread);
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar suas conversas. Tente novamente.';
      setConversationsError(msg);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingConversations(false);
      }
    }
  }, [isAuthenticated, userId]);

  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!conversationId || !isAuthenticated) return;

      setTotalUnreadOverride(null);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversationId === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );

      try {
        const res = await markConversationAsRead(conversationId);
        if (!isMountedRef.current) return;
        if (typeof res.totalUnreadCount === 'number' && Number.isFinite(res.totalUnreadCount)) {
          setTotalUnreadOverride(Math.max(0, res.totalUnreadCount));
        }
      } catch (err) {
        if (err instanceof ConversationApiError && (err.status === 401 || err.status === 403)) {
          console.error('[ConversationsContext] Erro de autenticação ao marcar leitura:', err.message);
          if (isMountedRef.current) {
            setConversationsError(err.message);
          }
          return;
        }
        console.warn(
          '[ConversationsContext] PATCH /conversations/{id}/read indisponível no momento; leitura mantida localmente.',
          err instanceof Error ? err.message : err
        );
      }
    },
    [isAuthenticated]
  );

  const setActiveConversationId = useCallback((conversationId: string | null) => {
    activeConversationIdRef.current = conversationId;
  }, []);

  const upsertConversation = useCallback((conversation: Conversation) => {
    setTotalUnreadOverride(null);
    setConversations((prev) => {
      const exists = prev.some((c) => c.conversationId === conversation.conversationId);
      const next = exists
        ? prev.map((c) =>
            c.conversationId === conversation.conversationId
              ? {
                  ...conversation,
                  unreadCount:
                    typeof conversation.unreadCount === 'number'
                      ? Math.max(0, conversation.unreadCount)
                      : Math.max(0, c.unreadCount ?? 0),
                }
              : c
          )
        : [{ ...conversation, unreadCount: Math.max(0, conversation.unreadCount ?? 0) }, ...prev];
      return sortConversationsByRecent(next);
    });
  }, []);

  const updateConversationPreview = useCallback(
    (conversationId: string, message: ChatMessage) => {
      setConversations((prev) =>
        sortConversationsByRecent(
          prev.map((conv) =>
            conv.conversationId === conversationId
              ? {
                  ...conv,
                  lastMessageText: message.text,
                  lastMessageAt: message.createdAt,
                  lastMessageSenderId: message.senderId,
                  updatedAt: message.createdAt,
                }
              : conv
          )
        )
      );
    },
    []
  );

  const registerMessageListener = useCallback((listener: MessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const handleSocketEvent = useCallback(
    (event: ConversationSocketEvent) => {
      if (event.type === 'CONNECTED') {
        return;
      }

      if (event.type === 'MESSAGE_READ') {
        if (userId && event.readBy === userId) {
          setTotalUnreadOverride(null);
          setConversations((prev) =>
            prev.map((conv) =>
              conv.conversationId === event.conversationId ? { ...conv, unreadCount: 0 } : conv
            )
          );
        }
        return;
      }

      if (event.type === 'NEW_MESSAGE') {
        const messageId = event.message.messageId;
        if (seenMessageIdsRef.current.has(messageId)) {
          return;
        }
        seenMessageIdsRef.current.add(messageId);
        if (seenMessageIdsRef.current.size > 500) {
          const oldest = seenMessageIdsRef.current.values().next().value;
          if (oldest) {
            seenMessageIdsRef.current.delete(oldest);
          }
        }

        listenersRef.current.forEach((listener) => {
          try {
            listener(event);
          } catch (err) {
            console.error('[ConversationsContext] Erro em listener de mensagem:', err);
          }
        });

        const isOwnMessage = Boolean(userId && event.message.senderId === userId);
        const isCurrentlyOpenAndVisible =
          activeConversationIdRef.current === event.conversationId &&
          typeof document !== 'undefined' &&
          document.visibilityState === 'visible';

        let foundInList = false;
        setTotalUnreadOverride(null);
        setConversations((prev) => {
          const updated = prev.map((conv) => {
            if (conv.conversationId !== event.conversationId) {
              return conv;
            }
            foundInList = true;
            const currentUnread = Math.max(0, conv.unreadCount ?? 0);
            const nextUnread = isOwnMessage
              ? currentUnread
              : isCurrentlyOpenAndVisible
                ? 0
                : currentUnread + 1;

            return {
              ...conv,
              lastMessageText: event.conversation?.lastMessageText ?? event.message.text,
              lastMessageAt: event.conversation?.lastMessageAt ?? event.message.createdAt,
              lastMessageSenderId:
                event.conversation?.lastMessageSenderId ?? event.message.senderId,
              updatedAt: event.conversation?.lastMessageAt ?? event.message.createdAt,
              unreadCount: Math.max(0, nextUnread),
            };
          });
          return sortConversationsByRecent(updated);
        });

        if (!isOwnMessage && isCurrentlyOpenAndVisible) {
          void markAsRead(event.conversationId);
        }

        if (!foundInList) {
          void refreshConversations();
        }
      }
    },
    [userId, markAsRead, refreshConversations]
  );

  const { status: socketStatus } = useConversationWebSocket({
    enabled: !isAuthLoading && isAuthenticated && Boolean(userId),
    userId,
    onEvent: handleSocketEvent,
  });

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated || !userId) {
      seenMessageIdsRef.current.clear();
      activeConversationIdRef.current = null;
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setConversations([]);
          setTotalUnreadOverride(null);
          setConversationsError(null);
          setIsLoadingConversations(false);
        }
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      void refreshConversations();
    }, 0);
    return () => clearTimeout(timer);
  }, [isAuthLoading, isAuthenticated, userId, refreshConversations]);

  useEffect(() => {
    const prev = prevSocketStatusRef.current;
    prevSocketStatusRef.current = socketStatus;

    if (
      isAuthenticated &&
      userId &&
      socketStatus === 'connected' &&
      (prev === 'reconnecting' || prev === 'error')
    ) {
      const timer = setTimeout(() => {
        void refreshConversations();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [socketStatus, isAuthenticated, userId, refreshConversations]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshConversations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, userId, refreshConversations]);

  const value = useMemo<ConversationsContextValue>(
    () => ({
      conversations,
      totalUnreadCount,
      socketStatus,
      isLoadingConversations,
      conversationsError,
      refreshConversations,
      markAsRead,
      setActiveConversationId,
      upsertConversation,
      updateConversationPreview,
      registerMessageListener,
    }),
    [
      conversations,
      totalUnreadCount,
      socketStatus,
      isLoadingConversations,
      conversationsError,
      refreshConversations,
      markAsRead,
      setActiveConversationId,
      upsertConversation,
      updateConversationPreview,
      registerMessageListener,
    ]
  );

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useConversations(): ConversationsContextValue {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversations deve ser utilizado dentro de um <ConversationsProvider>');
  }
  return context;
}
