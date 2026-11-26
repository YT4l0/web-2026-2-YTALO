import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScreenType, Vehicle } from '../../types/vehicle';
import {
  MAX_MESSAGE_LENGTH,
  type ChatMessage,
  type Conversation,
  type ConversationSocketStatus,
} from '../../types/conversation';
import {
  ConversationApiError,
  listConversationMessages,
  sendConversationMessage,
} from '../../services/conversationService';
import { documentToVehicle, noSqlFindVehicleById } from '../../services/noSqlVehicleService';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../context/ConversationsContext';
import {
  IconCar,
  IconCheck,
  IconChevronLeft,
  IconMessageSquare,
  IconSearch,
  IconShieldCheck,
} from '../icons/Icons';

interface ConversationsScreenProps {
  initialConversation?: Conversation | null;
  onClearInitialConversation?: () => void;
  onNavigate: (screen: ScreenType) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

const NEAR_BOTTOM_THRESHOLD_PX = 80;

function formatShortDateTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatMessageTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function mergeAndSortMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const msg of existing) {
    byId.set(msg.messageId, msg);
  }
  for (const msg of incoming) {
    byId.set(msg.messageId, msg);
  }
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function getSocketStatusDisplay(status: ConversationSocketStatus): {
  label: string;
  dotClass: string;
  textClass: string;
} {
  switch (status) {
    case 'connected':
      return {
        label: 'Em tempo real',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-700',
      };
    case 'connecting':
      return {
        label: 'Conectando…',
        dotClass: 'bg-blue-500 animate-pulse',
        textClass: 'text-blue-700',
      };
    case 'reconnecting':
      return {
        label: 'Reconectando…',
        dotClass: 'bg-amber-500 animate-pulse',
        textClass: 'text-amber-700',
      };
    case 'disabled':
      return {
        label: 'Tempo real não configurado',
        dotClass: 'bg-slate-400',
        textClass: 'text-slate-500',
      };
    case 'disconnected':
    case 'error':
    default:
      return {
        label: 'Sem conexão',
        dotClass: 'bg-red-500',
        textClass: 'text-red-700',
      };
  }
}

export const ConversationsScreen: React.FC<ConversationsScreenProps> = ({
  initialConversation = null,
  onClearInitialConversation,
  onNavigate,
  onSelectVehicle,
}) => {
  const { user } = useAuth();
  const {
    conversations,
    socketStatus,
    isLoadingConversations,
    conversationsError,
    refreshConversations,
    markAsRead,
    setActiveConversationId,
    upsertConversation,
    updateConversationPreview,
    registerMessageListener,
  } = useConversations();

  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversation?.conversationId || null
  );
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(
    initialConversation ? 'chat' : 'list'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [draftText, setDraftText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [vehicleActionError, setVehicleActionError] = useState<string | null>(null);
  const [hasNewMessagesIndicator, setHasNewMessagesIndicator] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const selectedIdRef = useRef<string | null>(selectedId);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    setActiveConversationId(selectedId);
  }, [selectedId, setActiveConversationId]);

  useEffect(() => {
    return () => {
      setActiveConversationId(null);
    };
  }, [setActiveConversationId]);

  const scrollContainerToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
    isNearBottomRef.current = true;
    setHasNewMessagesIndicator(false);
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setHasNewMessagesIndicator(false);
    }
  }, []);

  const loadMessagesForConversation = useCallback(
    async (conversationId: string, scrollToBottomOnSuccess = true) => {
      setIsLoadingMessages(true);
      setMessagesError(null);
      setVehicleActionError(null);
      setHasNewMessagesIndicator(false);
      try {
        const data = await listConversationMessages(conversationId);
        if (selectedIdRef.current !== conversationId) return;

        setMessages(mergeAndSortMessages([], data.items));
        setNextCursor(data.nextCursor);
        upsertConversation({ ...data.conversation, unreadCount: 0 });
        void markAsRead(conversationId);

        if (scrollToBottomOnSuccess) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              scrollContainerToBottom('auto');
            });
          });
        }
      } catch (err) {
        if (selectedIdRef.current !== conversationId) return;
        const msg =
          err instanceof ConversationApiError
            ? err.message
            : 'Não foi possível carregar as mensagens desta conversa.';
        setMessagesError(msg);
        setMessages([]);
      } finally {
        if (selectedIdRef.current === conversationId) {
          setIsLoadingMessages(false);
        }
      }
    },
    [markAsRead, scrollContainerToBottom, upsertConversation]
  );

  useEffect(() => {
    if (!initialConversation) return;
    upsertConversation(initialConversation);
    const timer = setTimeout(() => {
      setSelectedId(initialConversation.conversationId);
      setMobileView('chat');
      if (onClearInitialConversation) {
        onClearInitialConversation();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [initialConversation, onClearInitialConversation, upsertConversation]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const fetchMessages = async () => {
      if (active) {
        await loadMessagesForConversation(selectedId, true);
      }
    };
    void fetchMessages();
    return () => {
      active = false;
    };
  }, [selectedId, loadMessagesForConversation]);

  useEffect(() => {
    const unsubscribe = registerMessageListener((event) => {
      if (event.conversationId !== selectedIdRef.current) {
        return;
      }

      const container = messagesContainerRef.current;
      const wasNearBottom = container
        ? container.scrollHeight - container.scrollTop - container.clientHeight <=
          NEAR_BOTTOM_THRESHOLD_PX
        : isNearBottomRef.current;
      const isOwnMessage = Boolean(user?.id && event.message.senderId === user.id);

      setMessages((prev) => mergeAndSortMessages(prev, [event.message]));

      if (wasNearBottom || isOwnMessage) {
        requestAnimationFrame(() => {
          scrollContainerToBottom('smooth');
        });
      } else {
        setHasNewMessagesIndicator(true);
      }
    });

    return unsubscribe;
  }, [registerMessageListener, scrollContainerToBottom, user?.id]);

  // Sincronização de segurança opcional a cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshConversations();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshConversations]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.conversationId === selectedId) || null,
    [conversations, selectedId]
  );

  const filteredConversations = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (c) =>
        c.otherParticipantName.toLowerCase().includes(term) ||
        c.vehicle.title.toLowerCase().includes(term) ||
        c.vehicle.city.toLowerCase().includes(term)
    );
  }, [conversations, searchQuery]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setSendError(null);
    setHasNewMessagesIndicator(false);
    setMobileView('chat');
    void markAsRead(conversationId);
  };

  const handleLoadOlderMessages = async () => {
    if (!selectedId || !nextCursor || isLoadingOlder) return;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;

    setIsLoadingOlder(true);
    setMessagesError(null);
    try {
      const data = await listConversationMessages(selectedId, nextCursor);
      if (selectedIdRef.current !== selectedId) return;

      setMessages((prev) => mergeAndSortMessages(data.items, prev));
      setNextCursor(data.nextCursor);

      requestAnimationFrame(() => {
        const el = messagesContainerRef.current;
        if (!el) return;
        const newScrollHeight = el.scrollHeight;
        el.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao carregar mensagens anteriores.';
      setMessagesError(msg);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || isSending) return;

    const trimmed = draftText.trim();
    if (!trimmed) {
      setSendError('Digite uma mensagem antes de enviar.');
      return;
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setSendError(`A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const savedMessage = await sendConversationMessage(selectedId, trimmed);
      setMessages((prev) => mergeAndSortMessages(prev, [savedMessage]));
      updateConversationPreview(selectedId, savedMessage);
      setDraftText('');
      requestAnimationFrame(() => {
        scrollContainerToBottom('smooth');
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar a mensagem. Tente novamente.';
      setSendError(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenVehicle = async (conv: Conversation) => {
    setVehicleActionError(null);
    try {
      const doc = await noSqlFindVehicleById(conv.vehicleId);
      if (!doc || doc.status !== 'ativo') {
        setVehicleActionError('Este anúncio não está mais disponível para visualização pública.');
        upsertConversation({
          ...conv,
          vehicleAvailable: false,
          vehicleStatus: doc?.status || 'indisponivel',
        });
        return;
      }
      onSelectVehicle(documentToVehicle(doc));
    } catch (err) {
      setVehicleActionError(
        err instanceof Error ? err.message : 'Não foi possível abrir os detalhes do anúncio.'
      );
    }
  };

  const trimmedLength = draftText.trim().length;
  const socketDisplay = getSocketStatusDisplay(socketStatus);

  return (
    <div className="bg-[#faf8ff] min-h-[calc(100vh-64px)] text-[#131b2e] font-sans flex flex-col">
      {/* Top Utility Bar */}
      <section className="w-full bg-[#f2f3ff] border-b border-blue-100/80 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-blue-600">
              <IconMessageSquare size={22} />
              <h1 className="text-lg sm:text-xl font-extrabold text-[#131b2e] tracking-tight">
                Conversas
              </h1>
            </div>
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div className="hidden sm:flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
              <IconShieldCheck size={16} />
              <span>Negociação direta pelo MotorLocal</span>
            </div>
            <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div
              className={`flex items-center gap-1.5 text-xs font-medium ${socketDisplay.textClass}`}
              role="status"
              aria-live="polite"
            >
              <span className={`w-2 h-2 rounded-full ${socketDisplay.dotClass}`} aria-hidden="true" />
              <span>{socketDisplay.label}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void refreshConversations();
              if (selectedId) void loadMessagesForConversation(selectedId, false);
            }}
            disabled={isLoadingConversations || isLoadingMessages}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 transition-colors disabled:opacity-60 shadow-2xs"
          >
            {isLoadingConversations || isLoadingMessages ? 'Atualizando...' : 'Atualizar conversas'}
          </button>
        </div>
      </section>

      {/* Main Split Workspace */}
      <section className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:h-[calc(100vh-210px)]">
          {/* LEFT COLUMN: Conversations List */}
          <aside
            className={`lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 bg-[#f2f3ff]/70 border-r border-slate-200/80 h-full overflow-hidden ${
              mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Search bar */}
            <div className="p-3.5 bg-white border-b border-slate-200/80 shrink-0">
              <div className="relative">
                <IconSearch
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por participante ou veículo..."
                  className="w-full pl-9 pr-3 py-2 bg-[#f2f3ff] border border-transparent focus:border-blue-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Thread items */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
              {isLoadingConversations && conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2.5">
                  <svg
                    className="animate-spin h-7 w-7 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-xs font-medium">Carregando conversas...</span>
                </div>
              ) : conversationsError && conversations.length === 0 ? (
                <div className="p-4 m-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-3">
                  <p className="font-semibold">{conversationsError}</p>
                  <button
                    type="button"
                    onClick={() => void refreshConversations()}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-14 px-5 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <IconMessageSquare size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {conversations.length === 0
                      ? 'Nenhuma conversa iniciada'
                      : 'Nenhuma conversa encontrada'}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {conversations.length === 0
                      ? 'Acesse os detalhes de um veículo e clique em "Conversar com vendedor" para iniciar uma negociação.'
                      : 'Tente buscar por outro nome ou modelo de veículo.'}
                  </p>
                  {conversations.length === 0 && (
                    <button
                      type="button"
                      onClick={() => onNavigate('search')}
                      className="mt-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                    >
                      Explorar veículos
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = conv.conversationId === selectedId;
                  const unread = Math.max(0, conv.unreadCount ?? 0);
                  const hasUnread = unread > 0;
                  const unreadLabel = unread >= 100 ? '99+' : String(unread);

                  return (
                    <button
                      key={conv.conversationId}
                      type="button"
                      onClick={() => handleSelectConversation(conv.conversationId)}
                      aria-label={
                        hasUnread
                          ? `${conv.otherParticipantName}, ${conv.vehicle.title}, ${unread} ${
                              unread === 1 ? 'mensagem não lida' : 'mensagens não lidas'
                            }`
                          : `${conv.otherParticipantName}, ${conv.vehicle.title}`
                      }
                      className={`w-full text-left p-3 rounded-xl transition-all relative border ${
                        isActive
                          ? 'bg-white border-blue-200 shadow-sm'
                          : hasUnread
                            ? 'bg-blue-50/70 border-blue-100 hover:bg-white'
                            : 'bg-transparent border-transparent hover:bg-white/70'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-1 top-3 bottom-3 w-1 rounded-full bg-blue-600" />
                      )}
                      <div className="flex items-start gap-3 pl-1">
                        <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                          {getInitials(conv.otherParticipantName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3
                              className={`text-xs truncate ${
                                hasUnread
                                  ? 'font-extrabold text-slate-950'
                                  : 'font-bold text-slate-900'
                              }`}
                            >
                              {conv.otherParticipantName}
                            </h3>
                            <span
                              className={`text-[11px] shrink-0 ${
                                hasUnread
                                  ? 'text-blue-700 font-bold'
                                  : 'text-slate-400 font-medium'
                              }`}
                            >
                              {formatShortDateTime(conv.lastMessageAt || conv.updatedAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold text-blue-700 truncate">
                              {conv.vehicle.title}
                            </span>
                            {!conv.vehicleAvailable && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                                Indisponível
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <p
                              className={`text-[11px] truncate ${
                                hasUnread
                                  ? 'font-bold text-slate-900'
                                  : 'text-slate-500'
                              }`}
                            >
                              {conv.lastMessageText
                                ? conv.lastMessageText
                                : 'Conversa iniciada — envie a primeira mensagem.'}
                            </p>

                            {hasUnread && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold shrink-0 leading-none">
                                <span>{unreadLabel}</span>
                                <span className="sr-only">não lidas</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT COLUMN: Active Conversation Workspace */}
          <section
            className={`lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-full bg-white overflow-hidden relative ${
              mobileView === 'list' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {!activeConversation ? (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#faf8ff]/50">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <IconMessageSquare size={26} />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Selecione uma conversa
                </h2>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Escolha uma negociação na lista ao lado para visualizar o histórico de mensagens e responder ao participante.
                </p>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-white space-y-3 shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => setMobileView('list')}
                        className="lg:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        aria-label="Voltar para lista de conversas"
                      >
                        <IconChevronLeft size={18} />
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {getInitials(activeConversation.otherParticipantName)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-extrabold text-slate-900 truncate">
                            {activeConversation.otherParticipantName}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                            {activeConversation.role === 'buyer' ? 'Anunciante' : 'Interessado'}
                          </span>
                        </div>
                        {activeConversation.vehicle.location && (
                          <p className="text-[11px] text-slate-500 truncate">
                            {activeConversation.vehicle.location}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void loadMessagesForConversation(activeConversation.conversationId, false)
                      }
                      disabled={isLoadingMessages}
                      className="px-3 py-1.5 rounded-xl bg-[#f2f3ff] hover:bg-blue-100/70 text-blue-700 text-xs font-bold transition-colors disabled:opacity-60 shrink-0"
                    >
                      {isLoadingMessages ? 'Consultando...' : 'Atualizar mensagens'}
                    </button>
                  </div>

                  {/* Pinned Vehicle Summary */}
                  <div className="p-2.5 rounded-xl bg-[#f2f3ff] border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {activeConversation.vehicle.mainImage ? (
                        <img
                          src={activeConversation.vehicle.mainImage}
                          alt={activeConversation.vehicle.title}
                          className="w-14 h-10 rounded-lg object-cover shrink-0 bg-slate-200"
                        />
                      ) : (
                        <div className="w-14 h-10 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                          <IconCar size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {activeConversation.vehicle.title}
                          </span>
                          {!activeConversation.vehicleAvailable && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                              Anúncio indisponível
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-extrabold text-blue-600">
                            R$ {Number(activeConversation.vehicle.price || 0).toLocaleString('pt-BR')}
                          </span>
                          {activeConversation.vehicle.year && (
                            <span className="text-slate-500 text-[11px]">
                              • {activeConversation.vehicle.year}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {activeConversation.vehicleAvailable && (
                      <button
                        type="button"
                        onClick={() => void handleOpenVehicle(activeConversation)}
                        className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 transition-colors shrink-0"
                      >
                        Ver anúncio
                      </button>
                    )}
                  </div>

                  {!activeConversation.vehicleAvailable && (
                    <div
                      role="status"
                      className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium"
                    >
                      Este anúncio tornou-se indisponível (ocultado ou removido). O histórico desta conversa foi preservado.
                    </div>
                  )}

                  {vehicleActionError && (
                    <div
                      role="alert"
                      className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium"
                    >
                      {vehicleActionError}
                    </div>
                  )}
                </div>

                {/* Messages History */}
                <div className="relative flex-1 min-h-0 flex flex-col">
                  <div
                    ref={messagesContainerRef}
                    onScroll={handleMessagesScroll}
                    className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-[#faf8ff]"
                  >
                    {nextCursor && (
                      <div className="flex justify-center pb-2">
                        <button
                          type="button"
                          onClick={() => void handleLoadOlderMessages()}
                          disabled={isLoadingOlder}
                          className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {isLoadingOlder ? 'Carregando...' : 'Carregar mensagens anteriores'}
                        </button>
                      </div>
                    )}

                    {isLoadingMessages ? (
                      <div className="flex flex-col items-center justify-center py-14 text-slate-500 gap-2">
                        <svg
                          className="animate-spin h-7 w-7 text-blue-600"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        <span className="text-xs font-medium">Carregando mensagens...</span>
                      </div>
                    ) : messagesError ? (
                      <div
                        role="alert"
                        className="max-w-md mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center space-y-2.5"
                      >
                        <p className="font-semibold">{messagesError}</p>
                        <button
                          type="button"
                          onClick={() =>
                            void loadMessagesForConversation(
                              activeConversation.conversationId,
                              false
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-2">
                        <p className="text-sm font-bold text-slate-700">
                          Nenhuma mensagem enviada ainda
                        </p>
                        <p className="text-xs text-slate-500">
                          Envie a primeira mensagem abaixo para iniciar a conversa sobre este veículo.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = user?.id ? msg.senderId === user.id : false;
                        return (
                          <div
                            key={msg.messageId}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[82%] sm:max-w-[70%] flex flex-col ${
                                isMine ? 'items-end' : 'items-start'
                              }`}
                            >
                              {!isMine && (
                                <span className="text-[11px] font-semibold text-slate-600 mb-1 px-1">
                                  {msg.senderName}
                                </span>
                              )}
                              <div
                                className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                                  isMine
                                    ? 'bg-blue-600 text-white rounded-tr-xs'
                                    : 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs'
                                }`}
                              >
                                {msg.text}
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-1">
                                {formatMessageTimestamp(msg.createdAt)}
                                {isMine && <IconCheck size={11} className="text-blue-600" />}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {hasNewMessagesIndicator && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
                      <button
                        type="button"
                        onClick={() => scrollContainerToBottom('smooth')}
                        className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-colors"
                      >
                        Novas mensagens
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Composer */}
                <form
                  onSubmit={(e) => void handleSendMessage(e)}
                  className="p-3.5 sm:p-4 bg-white border-t border-slate-200/80 space-y-2 shrink-0"
                >
                  {sendError && (
                    <div
                      role="alert"
                      className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium"
                    >
                      {sendError}
                    </div>
                  )}

                  <div className="flex items-end gap-2.5">
                    <div className="flex-1">
                      <textarea
                        rows={2}
                        value={draftText}
                        onChange={(e) => {
                          setDraftText(e.target.value);
                          if (sendError) setSendError(null);
                        }}
                        maxLength={MAX_MESSAGE_LENGTH}
                        placeholder={`Escreva sua mensagem para ${activeConversation.otherParticipantName}...`}
                        className="w-full px-3.5 py-2.5 bg-[#f2f3ff] border border-slate-200 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSending || trimmedLength === 0}
                      className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
                    >
                      {isSending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Não faça pagamentos antecipados antes de vistoriar o veículo.</span>
                    <span
                      className={
                        trimmedLength >= MAX_MESSAGE_LENGTH ? 'text-red-600 font-semibold' : ''
                      }
                    >
                      {draftText.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};
