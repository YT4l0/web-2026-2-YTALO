/**
 * tests/brazilTime.test.ts
 * Testa a ferramenta brazilTimeTool sem chamadas reais de rede.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock do fetch global antes de importar o módulo
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Importa após o mock
const { brazilTimeTool } = await import('../src/tools/brazilTime.js');

describe('brazilTimeTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve ter name e description corretos', () => {
    expect(brazilTimeTool.toolSpec.name).toBe('get_brazil_time');
    expect(brazilTimeTool.toolSpec.description).toContain('Brasil');
  });

  it('deve retornar horário do NTP quando a requisição tem sucesso', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => '26/11/2026 13:55:00',
    });

    const result = await brazilTimeTool.invoke({});
    expect(typeof result).toBe('string');
    expect(result).toContain('26/11/2026 13:55:00');
    expect(result).toContain('relogio.ntp.br');
  });

  it('deve retornar fallback quando o NTP falha (HTTP error)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    });

    const result = await brazilTimeTool.invoke({});
    expect(typeof result).toBe('string');
    // Fallback deve mencionar America/Sao_Paulo e não "horário local do servidor"
    expect(result).toContain('America/Sao_Paulo');
    expect(result).not.toContain('horário local do servidor');
  });

  it('deve retornar fallback quando o fetch lança erro de rede', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    const result = await brazilTimeTool.invoke({});
    expect(typeof result).toBe('string');
    expect(result).toContain('America/Sao_Paulo');
    expect(result).not.toContain('horário local do servidor');
  });

  it('deve retornar fallback quando o formato do NTP é inesperado', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => 'invalid-format',
    });

    const result = await brazilTimeTool.invoke({});
    expect(typeof result).toBe('string');
    expect(result).toContain('America/Sao_Paulo');
    expect(result).not.toContain('horário local do servidor');
  });

  it('o fallback não deve revelar "servidor" na resposta', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));

    const result = await brazilTimeTool.invoke({});
    // "servidor" não deve aparecer no texto retornado ao usuário
    expect(result.toLowerCase()).not.toContain('servidor');
  });

  it('não deve usar eval nem Function no código', async () => {
    // Teste estrutural: lê o código fonte e verifica ausência de eval/Function
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const src = fs.readFileSync(
      path.join(__dirname, '../src/tools/brazilTime.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/\beval\s*\(/);
    expect(src).not.toMatch(/new\s+Function\s*\(/);
  });
});