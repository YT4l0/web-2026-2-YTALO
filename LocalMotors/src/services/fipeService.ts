export interface FipeMarca { codigo: string; nome: string }
export interface FipeModelo { codigo: number; nome: string }
export interface FipeAno { codigo: string; nome: string }
export interface FipeModelosResponse { modelos: FipeModelo[]; anos: FipeAno[] }
export interface FipePreco {
  Valor: string; Marca: string; Modelo: string; AnoModelo: number; Combustivel: string;
  CodigoFipe: string; MesReferencia: string; TipoVeiculo: number; SiglaCombustivel: string;
}
export type FipeTipoVeiculo = 'carros' | 'motos' | 'caminhoes';

const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1';

async function fipeRequest<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${FIPE_BASE_URL}/${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`A consulta FIPE falhou (${response.status}).`);
    return await response.json() as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('A consulta FIPE excedeu o tempo limite.', { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function fetchFipeMarcas(tipo: FipeTipoVeiculo): Promise<FipeMarca[]> {
  return fipeRequest(`${tipo}/marcas`);
}
export function fetchFipeModelos(tipo: FipeTipoVeiculo, marca: string): Promise<FipeModelosResponse> {
  return fipeRequest(`${tipo}/marcas/${encodeURIComponent(marca)}/modelos`);
}
export function fetchFipeAnos(tipo: FipeTipoVeiculo, marca: string, modelo: string): Promise<FipeAno[]> {
  return fipeRequest(`${tipo}/marcas/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/anos`);
}
export function fetchFipePreco(tipo: FipeTipoVeiculo, marca: string, modelo: string, ano: string): Promise<FipePreco> {
  return fipeRequest(`${tipo}/marcas/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/anos/${encodeURIComponent(ano)}`);
}

export function parseFipeValor(valor: string): number {
  return Number.parseFloat(valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
}
export function calcFipeDifference(askingPrice: number, fipePrice: number): { percentage: number; label: string; isBelowFipe: boolean } {
  const percentage = ((fipePrice - askingPrice) / fipePrice) * 100;
  const isBelowFipe = askingPrice < fipePrice;
  const label = askingPrice === fipePrice
    ? 'Preço na FIPE'
    : `${Math.abs(percentage).toFixed(1)}% ${isBelowFipe ? 'abaixo' : 'acima'} da FIPE`;
  return { percentage, label, isBelowFipe };
}
