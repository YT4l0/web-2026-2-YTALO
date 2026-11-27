/**
 * src/tools/brazilTime.ts
 * Ferramenta que informa a data e hora atual do Brasil (America/Sao_Paulo).
 * Consulta https://relogio.ntp.br/horacerta/glight.php com timeout de 4s.
 * Fallback: Date() com Intl.DateTimeFormat se a requisição falhar.
 * Sem eval, sem Function(), sem APIs de browser.
 */
import { tool } from '@strands-agents/sdk';
import { z } from 'zod';

const TIMEZONE = 'America/Sao_Paulo';
const NTP_URL = 'https://relogio.ntp.br/horacerta/glight.php';
const TIMEOUT_MS = 4000;

function formatWithIntl(date: Date): string {
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    dateStyle: 'full',
    timeStyle: 'long',
  });
  return fmt.format(date);
}

/**
 * Tenta obter o horário do NTP.br.
 * A resposta é texto simples como: "26/11/2026 13:55:00"
 */
async function fetchNtpTime(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(NTP_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MotorLocal-Agent/1.0' },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = (await res.text()).trim();
    // Valida que o texto parece uma data/hora (dd/mm/yyyy hh:mm:ss)
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(text)) {
      return `${text} (Horário de Brasília — fonte: relogio.ntp.br)`;
    }

    throw new Error('Formato inesperado');
  } finally {
    clearTimeout(timer);
  }
}

export const brazilTimeTool = tool({
  name: 'get_brazil_time',
  description:
    'Retorna a data e hora atual do Brasil no fuso horário de Brasília (America/Sao_Paulo). ' +
    'Use sempre que o usuário perguntar sobre data, hora ou horário atual.',
  inputSchema: z.object({}),
  callback: async (): Promise<string> => {
    try {
      return await fetchNtpTime();
    } catch {
      // Fallback: usa o relógio interno com fuso America/Sao_Paulo.
      // Não chamamos isso de "horário local do servidor" para não revelar
      // detalhes de infraestrutura; a precisão pode diferir do NTP.
      const formatted = formatWithIntl(new Date());
      return `${formatted} (America/Sao_Paulo — fonte NTP indisponível)`;
    }
  },
});