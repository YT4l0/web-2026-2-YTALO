/**
 * tests/snapshotStorage.test.ts
 * Testa o DynamoSnapshotStorage com DynamoDB mockado.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Snapshot } from '@strands-agents/sdk';

// Mock das variáveis de ambiente
vi.stubEnv('AI_CHAT_SNAPSHOTS_TABLE', 'test-snapshots-table');
vi.stubEnv('COGNITO_USER_POOL_ID', 'us-east-1_TEST');
vi.stubEnv('COGNITO_APP_CLIENT_ID', 'test-client-id');
vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
vi.stubEnv('AI_CHAT_CONNECTIONS_TABLE', 'test-connections-table');

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({ send: sendMock }),
  },
  PutCommand: vi.fn().mockImplementation((params) => params),
  GetCommand: vi.fn().mockImplementation((params) => params),
  QueryCommand: vi.fn().mockImplementation((params) => params),
  ScanCommand: vi.fn().mockImplementation((params) => params),
  BatchWriteCommand: vi.fn().mockImplementation((params) => params),
}));

const { DynamoSnapshotStorage } = await import('../src/snapshotStorage.js');

const mockLocation = {
  sessionId: 'user-123',
  scope: 'agent' as const,
  scopeId: 'motorlocal-ai-agent',
};

const expectedPk = 'SESSION#user-123#agent#motorlocal-ai-agent';

const mockSnapshot = {
  scope: 'agent',
  schemaVersion: '1.0',
  createdAt: '2026-11-26T12:00:00.000Z',
  data: {},
  appData: {},
} as unknown as Snapshot;

describe('DynamoSnapshotStorage', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('deve salvar o snapshot "latest" quando isLatest=true', async () => {
    sendMock.mockResolvedValue({});
    const storage = new DynamoSnapshotStorage();

    await storage.saveSnapshot({
      location: mockLocation,
      snapshotId: 'uuid-v7-example',
      isLatest: true,
      snapshot: mockSnapshot,
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const item = sendMock.mock.calls[0]?.[0]?.Item as Record<string, unknown>;
    expect(item['pk']).toBe(expectedPk);
    expect(item['sk']).toBe('latest');
    expect(item['data']).toBe(JSON.stringify(mockSnapshot));
    expect(typeof item['ttl']).toBe('number');
  });

  it('deve salvar snapshot imutável com o snapshotId quando isLatest=false', async () => {
    sendMock.mockResolvedValue({});
    const storage = new DynamoSnapshotStorage();

    await storage.saveSnapshot({
      location: mockLocation,
      snapshotId: 'uuid-v7-example',
      isLatest: false,
      snapshot: mockSnapshot,
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const item = sendMock.mock.calls[0]?.[0]?.Item as Record<string, unknown>;
    expect(item['sk']).toBe('uuid-v7-example');
  });

  it('deve carregar o snapshot "latest" por padrão', async () => {
    sendMock.mockResolvedValueOnce({
      Item: { data: JSON.stringify(mockSnapshot) },
    });
    const storage = new DynamoSnapshotStorage();

    const result = await storage.loadSnapshot({ location: mockLocation });

    expect(result).toEqual(mockSnapshot);
    const key = sendMock.mock.calls[0]?.[0]?.Key as Record<string, unknown>;
    expect(key).toEqual({ pk: expectedPk, sk: 'latest' });
  });

  it('deve carregar snapshot imutável quando snapshotId é informado', async () => {
    sendMock.mockResolvedValueOnce({
      Item: { data: JSON.stringify(mockSnapshot) },
    });
    const storage = new DynamoSnapshotStorage();

    await storage.loadSnapshot({
      location: mockLocation,
      snapshotId: 'uuid-1',
    });

    const key = sendMock.mock.calls[0]?.[0]?.Key as Record<string, unknown>;
    expect(key).toEqual({ pk: expectedPk, sk: 'uuid-1' });
  });

  it('deve retornar null quando snapshot não existe', async () => {
    sendMock.mockResolvedValueOnce({ Item: undefined });
    const storage = new DynamoSnapshotStorage();

    const result = await storage.loadSnapshot({ location: mockLocation });
    expect(result).toBeNull();
  });

  it('deve retornar null quando o JSON está corrompido', async () => {
    sendMock.mockResolvedValueOnce({ Item: { data: 'invalid-json{' } });
    const storage = new DynamoSnapshotStorage();

    const result = await storage.loadSnapshot({ location: mockLocation });
    expect(result).toBeNull();
  });

  it('deve listar apenas snapshots imutáveis, ordenados', async () => {
    sendMock.mockResolvedValueOnce({
      Items: [
        { sk: 'uuid-2' },
        { sk: 'latest' },
        { sk: 'manifest' },
        { sk: 'uuid-1' },
      ],
    });
    const storage = new DynamoSnapshotStorage();

    const list = await storage.listSnapshotIds({ location: mockLocation });
    expect(list).toEqual(['uuid-1', 'uuid-2']);
  });

  it('deve aplicar startAfter e limit em listSnapshotIds', async () => {
    sendMock.mockResolvedValueOnce({
      Items: [{ sk: 'uuid-1' }, { sk: 'uuid-2' }, { sk: 'uuid-3' }],
    });
    const storage = new DynamoSnapshotStorage();

    const list = await storage.listSnapshotIds({
      location: mockLocation,
      startAfter: 'uuid-1',
      limit: 1,
    });

    expect(list).toEqual(['uuid-2']);
  });

  it('deve retornar lista vazia quando limit <= 0', async () => {
    const storage = new DynamoSnapshotStorage();
    const list = await storage.listSnapshotIds({
      location: mockLocation,
      limit: 0,
    });

    expect(list).toEqual([]);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('deve remover todos os snapshots da sessão', async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [
          { pk: expectedPk, sk: 'latest' },
          { pk: expectedPk, sk: 'uuid-1' },
        ],
      })
      .mockResolvedValueOnce({});

    const storage = new DynamoSnapshotStorage();
    await storage.deleteSession({ sessionId: 'user-123' });

    expect(sendMock).toHaveBeenCalledTimes(2);

    const scan = sendMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(scan['FilterExpression']).toBe('begins_with(pk, :prefix)');

    const batch = sendMock.mock.calls[1]?.[0]?.RequestItems as Record<
      string,
      unknown[]
    >;
    expect(batch['test-snapshots-table']).toHaveLength(2);
  });

  it('deve retornar manifest padrão quando não existe', async () => {
    sendMock.mockResolvedValueOnce({ Item: undefined });
    const storage = new DynamoSnapshotStorage();

    const manifest = await storage.loadManifest({ location: mockLocation });
    expect(manifest.schemaVersion).toBe('1.0');
    expect(typeof manifest.updatedAt).toBe('string');
  });

  it('deve salvar manifest com sk="manifest"', async () => {
    sendMock.mockResolvedValue({});
    const storage = new DynamoSnapshotStorage();

    await storage.saveManifest({
      location: mockLocation,
      manifest: { schemaVersion: '1.0', updatedAt: '2026-11-26T12:00:00.000Z' },
    });

    const item = sendMock.mock.calls[0]?.[0]?.Item as Record<string, unknown>;
    expect(item['pk']).toBe(expectedPk);
    expect(item['sk']).toBe('manifest');
  });
});
