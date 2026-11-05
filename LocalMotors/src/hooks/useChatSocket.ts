import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { AUTH_MODE } from '../config/cognito';

export type ChatSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'error';
  text: string;
}

export interface UseChatSocketResult {
  status: ChatSocketStatus;
  messages: ChatMessage[];
  isWaitingResponse: boolean;
  configError: string | null;
  sendMessage: (text: string) => void;
  reconnect: () => void;
}

export function useChatSocket(enabled: boolean): UseChatSocketResult {
  const [status, setStatus] = useState<ChatSocketStatus>('closed');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWaitingResponse, setIsWaitingResponse] = useState<boolean>(false);
  const [reconnectKey, setReconnectKey] = useState<number>(0);

  const socketRef = useRef<WebSocket | null>(null);

  const rawWsUrl = import.meta.env.VITE_CHAT_WS_URL as string | undefined;
  const wsUrl = rawWsUrl?.trim();

  // Valores derivados calculados diretamente no render (sem setState síncrono em useEffect)
  const configError =
    AUTH_MODE === 'mock'
      ? 'O chat via WebSocket não está disponível no modo mock. Alterne para o modo Cognito no .env.'
      : !wsUrl
        ? 'A URL do WebSocket não foi configurada. Defina VITE_CHAT_WS_URL no arquivo de ambiente (.env).'
        : null;

  const reconnect = useCallback(() => {
    setStatus('connecting');
    setReconnectKey((prev) => prev + 1);
  }, []);

  const sendMessage = useCallback((texto: string) => {
    const trimmed = texto.trim();
    if (!trimmed || trimmed.length > 1000) {
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Envio: apenas o campo message, sem outros campos
    socketRef.current.send(JSON.stringify({ message: trimmed }));

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: 'user',
        text: trimmed,
      },
    ]);
    setIsWaitingResponse(true);
  }, []);

  useEffect(() => {
    // Se o painel não estiver aberto ou se houver erro de configuração, não conecta
    if (!enabled || configError) {
      return;
    }

    let isMounted = true;
    let localSocket: WebSocket | null = null;

    const connect = async () => {
      try {
        const session = await fetchAuthSession();
        if (!isMounted) return;

        const token = session.tokens?.accessToken?.toString();
        if (!token) {
          setStatus('error');
          return;
        }

        // Chamada de setState após await (em conformidade com react-hooks/set-state-in-effect)
        setStatus('connecting');

        const finalUrl = `${wsUrl}?token=${encodeURIComponent(token)}`;
        localSocket = new WebSocket(finalUrl);
        socketRef.current = localSocket;

        localSocket.onopen = () => {
          if (!isMounted) return;
          setStatus('open');
        };

        localSocket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (
              data &&
              typeof data === 'object' &&
              (data.type === 'answer' || data.type === 'error') &&
              typeof data.text === 'string'
            ) {
              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  sender: data.type === 'error' ? 'error' : 'assistant',
                  text: data.text,
                },
              ]);
              setIsWaitingResponse(false);
            }
          } catch {
            // Ignora mensagens fora do formato esperado sem quebrar
          }
        };

        localSocket.onerror = () => {
          if (!isMounted) return;
          setStatus('error');
          setIsWaitingResponse(false);
        };

        localSocket.onclose = () => {
          if (!isMounted) return;
          setStatus('closed');
          setIsWaitingResponse(false);
        };
      } catch {
        if (!isMounted) return;
        setStatus('error');
        setIsWaitingResponse(false);
      }
    };

    connect();

    return () => {
      isMounted = false;
      setIsWaitingResponse(false);
      if (localSocket) {
        localSocket.close();
      }
      socketRef.current = null;
    };
  }, [enabled, configError, wsUrl, reconnectKey]);

  return {
    status,
    messages,
    isWaitingResponse,
    configError,
    sendMessage,
    reconnect,
  };
}
