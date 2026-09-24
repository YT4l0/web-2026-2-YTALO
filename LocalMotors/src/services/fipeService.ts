/**
 * FIPE Service - Esqueleto para integração com a API da Tabela FIPE
 * 
 * API Base: https://parallelum.com.br/fipe/api/v1
 * 
 * Fluxo de consulta FIPE:
 * 1. Buscar marcas   → GET /carros/marcas  (ou /motos/marcas)
 * 2. Buscar modelos   → GET /carros/marcas/{codigoMarca}/modelos
 * 3. Buscar anos      → GET /carros/marcas/{codigoMarca}/modelos/{codigoModelo}/anos
 * 4. Buscar preço     → GET /carros/marcas/{codigoMarca}/modelos/{codigoModelo}/anos/{codigoAno}
 * 
 * Documentação: https://deividfortuna.github.io/fipe/
 */

// ─── Tipos da API FIPE ──────────────────────────────────────────────────────

export interface FipeMarca {
  codigo: string;
  nome: string;
}

export interface FipeModelo {
  codigo: number;
  nome: string;
}

export interface FipeModelosResponse {
  modelos: FipeModelo[];
  anos: FipeAno[];
}

export interface FipeAno {
  codigo: string;
  nome: string;
}

export interface FipePreco {
  Valor: string;               // Ex: "R$ 92.400,00"
  Marca: string;               // Ex: "Toyota"
  Modelo: string;              // Ex: "Corolla XEi 2.0 Flex 16V Aut."
  AnoModelo: number;           // Ex: 2021
  Combustivel: string;         // Ex: "Gasolina"
  CodigoFipe: string;          // Ex: "015287-0"
  MesReferencia: string;       // Ex: "setembro de 2026"
  TipoVeiculo: number;         // 1 = Carro, 2 = Moto, 3 = Caminhão
  SiglaCombustivel: string;    // Ex: "G"
}

export type FipeTipoVeiculo = 'carros' | 'motos' | 'caminhoes';

// ─── URL Base ────────────────────────────────────────────────────────────────
const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1';

// ─── Funções da API FIPE ─────────────────────────────────────────────────────

/**
 * 1. Busca todas as marcas por tipo de veículo
 * 
 * Endpoint: GET /carros/marcas
 * 
 * @example
 * const marcas = await fetchFipeMarcas('carros');
 * // [{ codigo: "59", nome: "VW - VolksWagen" }, ...]
 */
export async function fetchFipeMarcas(tipo: FipeTipoVeiculo): Promise<FipeMarca[]> {
  // TODO: Implementar requisição real à API FIPE
  // const response = await fetch(`${FIPE_BASE_URL}/${tipo}/marcas`);
  // if (!response.ok) throw new Error(`Erro ao buscar marcas FIPE: ${response.status}`);
  // return await response.json();

  console.log(`[FIPE] fetchFipeMarcas → GET ${FIPE_BASE_URL}/${tipo}/marcas`);
  
  // Dados mock temporários para desenvolvimento
  return [
    { codigo: '21', nome: 'Fiat' },
    { codigo: '22', nome: 'Ford' },
    { codigo: '23', nome: 'GM - Chevrolet' },
    { codigo: '25', nome: 'Honda' },
    { codigo: '26', nome: 'Hyundai' },
    { codigo: '56', nome: 'Toyota' },
    { codigo: '59', nome: 'VW - VolksWagen' },
    { codigo: '101', nome: 'Yamaha' },
  ];
}

/**
 * 2. Busca modelos de uma marca
 * 
 * Endpoint: GET /carros/marcas/{codigoMarca}/modelos
 * 
 * @example
 * const { modelos, anos } = await fetchFipeModelos('carros', '59');
 * // modelos: [{ codigo: 5940, nome: "Gol 1.0 Mi Total Flex 8V 4p" }, ...]
 */
export async function fetchFipeModelos(
  tipo: FipeTipoVeiculo,
  codigoMarca: string
): Promise<FipeModelosResponse> {
  // TODO: Implementar requisição real à API FIPE
  // const response = await fetch(`${FIPE_BASE_URL}/${tipo}/marcas/${codigoMarca}/modelos`);
  // if (!response.ok) throw new Error(`Erro ao buscar modelos FIPE: ${response.status}`);
  // return await response.json();

  console.log(`[FIPE] fetchFipeModelos → GET ${FIPE_BASE_URL}/${tipo}/marcas/${codigoMarca}/modelos`);

  return {
    modelos: [
      { codigo: 1, nome: 'Modelo Exemplo 1' },
      { codigo: 2, nome: 'Modelo Exemplo 2' },
    ],
    anos: [
      { codigo: '2024-1', nome: '2024 Gasolina' },
      { codigo: '2023-1', nome: '2023 Gasolina' },
    ],
  };
}

/**
 * 3. Busca anos disponíveis de um modelo
 * 
 * Endpoint: GET /carros/marcas/{codigoMarca}/modelos/{codigoModelo}/anos
 * 
 * @example
 * const anos = await fetchFipeAnos('carros', '59', '5940');
 * // [{ codigo: "2024-1", nome: "2024 Gasolina" }, ...]
 */
export async function fetchFipeAnos(
  tipo: FipeTipoVeiculo,
  codigoMarca: string,
  codigoModelo: string
): Promise<FipeAno[]> {
  // TODO: Implementar requisição real à API FIPE
  // const response = await fetch(
  //   `${FIPE_BASE_URL}/${tipo}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos`
  // );
  // if (!response.ok) throw new Error(`Erro ao buscar anos FIPE: ${response.status}`);
  // return await response.json();

  console.log(
    `[FIPE] fetchFipeAnos → GET ${FIPE_BASE_URL}/${tipo}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos`
  );

  return [
    { codigo: '2024-1', nome: '2024 Gasolina' },
    { codigo: '2023-1', nome: '2023 Gasolina' },
    { codigo: '2022-1', nome: '2022 Gasolina' },
    { codigo: '2021-1', nome: '2021 Gasolina' },
  ];
}

/**
 * 4. Busca o preço FIPE de um veículo específico
 * 
 * Endpoint: GET /carros/marcas/{codigoMarca}/modelos/{codigoModelo}/anos/{codigoAno}
 * 
 * @example
 * const preco = await fetchFipePreco('carros', '56', '4828', '2021-1');
 * // { Valor: "R$ 92.400,00", Marca: "Toyota", ... }
 */
export async function fetchFipePreco(
  tipo: FipeTipoVeiculo,
  codigoMarca: string,
  codigoModelo: string,
  codigoAno: string
): Promise<FipePreco> {
  // TODO: Implementar requisição real à API FIPE
  // const response = await fetch(
  //   `${FIPE_BASE_URL}/${tipo}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos/${codigoAno}`
  // );
  // if (!response.ok) throw new Error(`Erro ao buscar preço FIPE: ${response.status}`);
  // return await response.json();

  console.log(
    `[FIPE] fetchFipePreco → GET ${FIPE_BASE_URL}/${tipo}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos/${codigoAno}`
  );

  return {
    Valor: 'R$ 0,00',
    Marca: 'Marca Exemplo',
    Modelo: 'Modelo Exemplo',
    AnoModelo: 2024,
    Combustivel: 'Gasolina',
    CodigoFipe: '000000-0',
    MesReferencia: 'setembro de 2026',
    TipoVeiculo: 1,
    SiglaCombustivel: 'G',
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converte o valor FIPE "R$ 92.400,00" para número 92400
 */
export function parseFipeValor(valor: string): number {
  return parseFloat(
    valor
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()
  );
}

/**
 * Calcula a diferença percentual entre o preço do anúncio e o preço FIPE
 */
export function calcFipeDifference(
  askingPrice: number,
  fipePrice: number
): { percentage: number; label: string; isBelowFipe: boolean } {
  const diff = fipePrice - askingPrice;
  const percentage = ((diff / fipePrice) * 100);
  const isBelowFipe = askingPrice < fipePrice;

  let label: string;
  if (isBelowFipe) {
    label = `${percentage.toFixed(1)}% abaixo da FIPE`;
  } else if (askingPrice === fipePrice) {
    label = 'Preço na FIPE';
  } else {
    label = `${Math.abs(percentage).toFixed(1)}% acima da FIPE`;
  }

  return { percentage, label, isBelowFipe };
}
