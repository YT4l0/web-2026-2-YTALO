/**
 * src/types/index.ts
 * Tipos centrais do agente de IA do MotorLocal.
 */

/** Evento WebSocket API Gateway recebido pelo Lambda */
export interface WsEvent {
  requestContext: {
    routeKey: '$connect' | '$disconnect' | '$default' | string;
    connectionId: string;
    domainName: string;
    stage: string;
  };
  queryStringParameters?: Record<string, string> | null;
  body?: string | null;
}

/** Resposta Lambda para API Gateway WebSocket */
export interface WsResponse {
  statusCode: number;
  body: string;
}

/** Payload recebido pelo cliente no $default */
export interface IncomingMessage {
  message: string;
  /**
   * Identificador de sessão enviado pelo cliente.
   * O ChatWidget atual envia apenas `message`, então o campo é opcional.
   * A memória do agente é isolada por usuário (sub do Cognito).
   */
  sessionId?: string;
}

/** Payload enviado de volta ao cliente */
export interface OutgoingMessage {
  type: 'answer' | 'error';
  text: string;
}

/** Conexão armazenada no DynamoDB */
export interface Connection {
  connectionId: string;
  userId: string;
  connectedAt: string;
  expiresAt: number;
}

/** Snapshot salvo no DynamoDB para memória persistente */
export interface AgentSnapshot {
  pk: string;        // SESSION#<userId>
  snapshotId: string; // 'latest' | uuid-v7
  data: string;       // JSON serializado do Snapshot do Strands
  updatedAt: string;
  ttl?: number;
}
