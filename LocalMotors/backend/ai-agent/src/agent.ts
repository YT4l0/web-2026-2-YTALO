/**
 * src/agent.ts
 * Fábrica do agente Strands com Google Gemini e memória persistente via DynamoDB.
 *
 * Cada sessão (userId + sessionId) tem seu próprio Agent isolado para garantir
 * que a memória não vaze entre usuários nem entre sessões do mesmo usuário.
 * O Agent é recriado a cada invocação Lambda mas carrega o snapshot salvo no
 * DynamoDB antes de responder.
 *
 * Limite de memória:
 * - SlidingWindowConversationManager com windowSize=20 mantém no máximo as
 *   últimas 20 mensagens no contexto, evitando snapshots excessivamente grandes.
 */
import { Agent, SessionManager, SlidingWindowConversationManager } from '@strands-agents/sdk';
import { GoogleModel } from '@strands-agents/sdk/models/google';
import { config } from './config.js';
import { DynamoSnapshotStorage } from './snapshotStorage.js';
import { SYSTEM_PROMPT } from './prompts/systemPrompt.js';
import { brazilTimeTool } from './tools/brazilTime.js';

/** Máximo de mensagens mantidas na janela de contexto. */
const MAX_CONVERSATION_MESSAGES = 20;

/**
 * Cria e retorna um Agent configurado para a sessão do usuário.
 *
 * @param userId    Sub do Cognito — identifica o usuário.
 * @param sessionId ID de sessão validado pelo handler (padrão "default").
 *
 * O sessionId passado ao SessionManager é `${userId}#${sessionId}`, garantindo
 * isolamento de memória mesmo quando dois usuários usam o mesmo sessionId.
 */
export function createAgentForUser(userId: string, sessionId: string = 'default'): Agent {
  const model = new GoogleModel({
    apiKey: config.geminiApiKey,
    modelId: config.geminiModelId,
  });

  const snapshotStorage = new DynamoSnapshotStorage();

  // Isolamento: combina userId e sessionId para que a memória seja exclusiva
  // desta combinação. Dois usuários distintos com sessionId="default" nunca
  // compartilham snapshot.
  const compositeSessionId = `${userId}#${sessionId}`;

  const sessionManager = new SessionManager({
    sessionId: compositeSessionId,
    storage: { snapshot: snapshotStorage },
    saveLatestOn: 'invocation',
  });

  // Limita o histórico de conversas a MAX_CONVERSATION_MESSAGES para evitar
  // que o snapshot cresça além do limite do item DynamoDB (400 KB).
  const conversationManager = new SlidingWindowConversationManager({
    windowSize: MAX_CONVERSATION_MESSAGES,
  });

  return new Agent({
    model,
    systemPrompt: SYSTEM_PROMPT,
    tools: [brazilTimeTool],
    // O SessionManager restaura o snapshot salvo antes de cada resposta e
    // persiste o estado ao final da invocação.
    sessionManager,
    conversationManager,
    printer: false, // Desabilita log automático no console Lambda
  });
}