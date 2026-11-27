/**
 * tests/handler.test.ts
 * Testes unitários do dispatcher principal do handler Lambda.
 * Todas as dependências externas são mockadas.
 *
 * Cobertura:
 * - $connect: token válido, sem token, token inválido
 * - $disconnect: remoção bem-sucedida
 * - $default: resposta normal, userId correto, sessionId opcional,
 *             isolamento userId+sessionId, sessão expirada, mensagem inválida
 * - sendMessage: tratado como $default
 * - rota desconhecida: retorna 400
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WsEvent } from '../src/types/index.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/tokenVerifier.js', () => ({
  verifyAccessToken: vi.fn().mockResolvedValue({ sub: 'user-123' }),
}));

vi.mock('../src/connectionRepository.js', () => ({
  saveConnection: vi.fn().mockResolvedValue(undefined),
  deleteConnection: vi.fn().mockResolvedValue(undefined),
  getConnection: vi.fn().mockResolvedValue({
    connectionId: 'conn-abc',
    userId: 'user-123',
    connectedAt: '2026-11-26T12:00:00.000Z',
    expiresAt: 0,
  }),
  getConnectionsByUserId: vi.fn().mockResolvedValue([]),
}));

vi.mock('../src/websocketPublisher.js', () => ({
  sendToConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/agent.js', () => ({
  createAgentForUser: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({
      toString: () => 'Olá! Como posso ajudar?',
    }),
  }),
}));

// ─── Importação do handler após os mocks ──────────────────────────────────────

const { handler } = await import('../src/handler.js');
const { getConnection } = await import('../src/connectionRepository.js');
const { sendToConnection } = await import('../src/websocketPublisher.js');
const { createAgentForUser } = await import('../src/agent.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(routeKey: string, overrides: Partial<WsEvent> = {}): WsEvent {
  return {
    requestContext: {
      routeKey: routeKey as WsEvent['requestContext']['routeKey'],
      connectionId: 'conn-abc',
      domainName: 'example.execute-api.us-east-1.amazonaws.com',
      stage: 'prod',
    },
    queryStringParameters: { token: 'fake-token' },
    body: JSON.stringify({ message: 'olá' }),
    ...overrides,
  };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restaura o mock padrão de getConnection
    vi.mocked(getConnection).mockResolvedValue({
      connectionId: 'conn-abc',
      userId: 'user-123',
      connectedAt: '2026-11-26T12:00:00.000Z',
      expiresAt: 0,
    });
  });

  describe('$connect', () => {
    it('deve retornar 200 com token válido', async () => {
      const event = makeEvent('$connect');
      const res = await handler(event);
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('Connected');
    });

    it('deve retornar 401 sem token', async () => {
      const event = makeEvent('$connect', { queryStringParameters: null });
      const res = await handler(event);
      expect(res.statusCode).toBe(401);
    });

    it('deve retornar 401 quando a verificação do token falha', async () => {
      const { verifyAccessToken } = await import('../src/tokenVerifier.js');
      vi.mocked(verifyAccessToken).mockRejectedValueOnce(
        Object.assign(new Error('Unauthorized'), { statusCode: 401 }),
      );

      const event = makeEvent('$connect');
      const res = await handler(event);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('$disconnect', () => {
    it('deve retornar 200 e remover a conexão', async () => {
      const event = makeEvent('$disconnect');
      const res = await handler(event);
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('Disconnected');
    });
  });

  describe('$default', () => {
    it('deve retornar 200 e enviar resposta do agente', async () => {
      const event = makeEvent('$default');
      const res = await handler(event);
      expect(res.statusCode).toBe(200);

      expect(sendToConnection).toHaveBeenCalledWith(
        'https://example.execute-api.us-east-1.amazonaws.com/prod',
        'conn-abc',
        { type: 'answer', text: 'Olá! Como posso ajudar?' },
      );
    });

    it('deve usar o userId da conexão para criar o agente', async () => {
      const event = makeEvent('$default');
      await handler(event);
      expect(createAgentForUser).toHaveBeenCalledWith('user-123', 'default');
    });

    it('deve usar sessionId "default" quando não enviado pelo cliente', async () => {
      const event = makeEvent('$default', {
        body: JSON.stringify({ message: 'olá' }),
      });
      await handler(event);
      expect(createAgentForUser).toHaveBeenCalledWith('user-123', 'default');
    });

    it('deve aceitar sessionId válido no corpo', async () => {
      const event = makeEvent('$default', {
        body: JSON.stringify({ message: 'olá', sessionId: 'default' }),
      });
      const res = await handler(event);
      expect(res.statusCode).toBe(200);
      expect(createAgentForUser).toHaveBeenCalledWith('user-123', 'default');
    });

    it('deve aceitar sessionId com letras, números, hífens e underscores', async () => {
      const event = makeEvent('$default', {
        body: JSON.stringify({ message: 'olá', sessionId: 'my-session_01' }),
      });
      const res = await handler(event);
      expect(res.statusCode).toBe(200);
      expect(createAgentForUser).toHaveBeenCalledWith('user-123', 'my-session_01');
    });

    it('deve retornar 400 com sessionId com caracteres inválidos', async () => {
      const event = makeEvent('$default', {
        body: JSON.stringify({ message: 'olá', sessionId: 'inválido!' }),
      });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
    });

    it('deve retornar 400 com sessionId acima de 100 caracteres', async () => {
      const event = makeEvent('$default', {
        body: JSON.stringify({ message: 'olá', sessionId: 'a'.repeat(101) }),
      });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
    });

    it('deve tratar sessionId vazio como "default"', async () => {
      const event = makeEvent('$default', {
        body: JSON.stringify({ message: 'olá', sessionId: '' }),
      });
      const res = await handler(event);
      expect(res.statusCode).toBe(200);
      expect(createAgentForUser).toHaveBeenCalledWith('user-123', 'default');
    });

    it('deve retornar 400 com body inválido', async () => {
      const event = makeEvent('$default', { body: 'não é json' });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
    });

    it('deve retornar 400 com mensagem ausente', async () => {
      const event = makeEvent('$default', {
        body: JSON.stringify({ outro: 'campo' }),
      });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
    });

    it('deve retornar 400 com mensagem acima de 1000 caracteres', async () => {
      const event = makeEvent('$default', {
        body: JSON.stringify({ message: 'a'.repeat(1001) }),
      });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
    });

    it('deve retornar 401 quando a conexão não existe', async () => {
      vi.mocked(getConnection).mockResolvedValueOnce(null);

      const event = makeEvent('$default');
      const res = await handler(event);
      expect(res.statusCode).toBe(401);

      expect(sendToConnection).toHaveBeenCalledWith(
        expect.any(String),
        'conn-abc',
        expect.objectContaining({ type: 'error' }),
      );
    });
  });

  describe('sendMessage (rota explícita)', () => {
    it('deve tratar sendMessage como $default e retornar 200', async () => {
      const event = makeEvent('sendMessage');
      const res = await handler(event);
      expect(res.statusCode).toBe(200);
      expect(sendToConnection).toHaveBeenCalledWith(
        expect.any(String),
        'conn-abc',
        { type: 'answer', text: 'Olá! Como posso ajudar?' },
      );
    });

    it('deve retornar 400 ao enviar mensagem inválida via sendMessage', async () => {
      const event = makeEvent('sendMessage', { body: 'não é json' });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('rota desconhecida', () => {
    it('deve retornar 400 para rota arbitrária', async () => {
      const event = makeEvent('outraRota');
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
    });
  });
});