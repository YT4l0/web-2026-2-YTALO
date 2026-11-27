/**
 * src/config.ts
 * Validação lazy das variáveis de ambiente.
 * Erros são propagados apenas em runtime, sem bloquear o typecheck.
 */

function requireEnv(name: string): string {
  const val = process.env[name]?.trim();
  if (!val) {
    throw new Error(`[ai-agent] Variável de ambiente obrigatória ausente: ${name}`);
  }
  return val;
}

export const config = {
  get cognitoUserPoolId(): string {
    return requireEnv('COGNITO_USER_POOL_ID');
  },
  get cognitoClientId(): string {
    return requireEnv('COGNITO_APP_CLIENT_ID');
  },
  get geminiApiKey(): string {
    return requireEnv('GEMINI_API_KEY');
  },
  get geminiModelId(): string {
    return process.env['GEMINI_MODEL_ID']?.trim() || 'gemini-2.0-flash';
  },
  get connectionsTable(): string {
    return requireEnv('AI_CHAT_CONNECTIONS_TABLE');
  },
  get snapshotsTable(): string {
    return requireEnv('AI_CHAT_SNAPSHOTS_TABLE');
  },
  get websocketEndpoint(): string {
    return requireEnv('AI_CHAT_WEBSOCKET_ENDPOINT');
  },
  /**
   * Endpoint de gerenciamento opcional. Quando ausente, o handler deriva o
   * endpoint a partir do próprio evento do API Gateway
   * (`https://<domainName>/<stage>`), que é sempre confiável.
   */
  get websocketEndpointOptional(): string | undefined {
    const value = process.env['AI_CHAT_WEBSOCKET_ENDPOINT']?.trim();
    return value || undefined;
  },
  /** TTL das conexões WebSocket em segundos (padrão: 24h) */
  connectionTtlSeconds: 24 * 60 * 60,
  /** TTL dos snapshots em segundos (padrão: 30 dias) */
  snapshotTtlSeconds: 30 * 24 * 60 * 60,
};
