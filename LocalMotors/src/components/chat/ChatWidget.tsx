import React, { useState, useEffect, useRef } from 'react';
import { useChatSocket } from '../../hooks/useChatSocket';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    status,
    messages,
    isWaitingResponse,
    configError,
    sendMessage,
    reconnect,
  } = useChatSocket(isOpen);

  // Fecha o painel com a tecla Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Rolagem automática para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isWaitingResponse, isOpen]);

  const isSendDisabled =
    status !== 'open' || isWaitingResponse || !inputMessage.trim();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendDisabled) return;

    sendMessage(inputMessage);
    setInputMessage('');
  };

  const statusConfig: Record<string, { label: string; dotClass: string }> = {
    connecting: { label: 'Conectando...', dotClass: 'bg-amber-400 animate-pulse' },
    open: { label: 'Online', dotClass: 'bg-emerald-500' },
    closed: { label: 'Desconectado', dotClass: 'bg-slate-400' },
    error: { label: 'Erro', dotClass: 'bg-rose-500' },
  };

  return (
    <>
      {/* Botão flutuante no canto inferior direito */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Abrir chat"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Painel do Chat */}
      {isOpen && (
        <section
          role="dialog"
          aria-label="Assistente"
          className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[360px] max-w-[360px] h-[500px] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        >
          {/* Cabeçalho */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Assistente</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${statusConfig[status]?.dotClass || 'bg-slate-400'}`}
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    {statusConfig[status]?.label || status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(status === 'closed' || status === 'error') && !configError && (
                <button
                  type="button"
                  onClick={reconnect}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                >
                  Reconectar
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Fechar chat"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          {/* Conteúdo: Erro de Configuração ou Lista de Mensagens */}
          {configError ? (
            <div className="flex-1 p-5 flex flex-col items-center justify-center text-center bg-slate-50">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Aviso de Configuração</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs">{configError}</p>
            </div>
          ) : (
            <>
              {/* Lista de mensagens com aria-live="polite" */}
              <div
                className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#faf8ff]"
                aria-live="polite"
              >
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center px-4">
                    <p>Olá! Como posso ajudar você hoje?</p>
                    <p className="mt-1 text-slate-400">Envie uma mensagem para iniciar o atendimento.</p>
                  </div>
                )}

                {messages.map((msg) => {
                  if (msg.sender === 'user') {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="bg-blue-600 text-white rounded-2xl rounded-br-xs px-3.5 py-2 max-w-[80%] whitespace-pre-wrap text-sm break-words shadow-xs">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  if (msg.sender === 'error') {
                    return (
                      <div key={msg.id} className="flex justify-start">
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-3.5 py-2 max-w-[80%] whitespace-pre-wrap text-sm break-words shadow-xs">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-bl-xs px-3.5 py-2 max-w-[80%] whitespace-pre-wrap text-sm break-words shadow-xs">
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {isWaitingResponse && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs flex items-center gap-1.5 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                      <span className="ml-1">Aguardando resposta...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulário de envio */}
              <form
                onSubmit={handleFormSubmit}
                className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleFormSubmit(e);
                    }
                  }}
                  maxLength={1000}
                  placeholder={status === 'open' ? 'Digite sua mensagem...' : 'Chat indisponível'}
                  disabled={status !== 'open' || isWaitingResponse}
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50 disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={isSendDisabled}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Enviar mensagem"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
};
