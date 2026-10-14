export interface MargemFiltrosDTO {
  dataInicio?: string;
  dataFim?: string;
  filial?: string;
  clienteId?: string;
  empresaIds: string[];
}

export interface MargemKpiDTO {
  receitaTotal: number;
  custoTotal: number;
  margemBrutaValor: number;
  margemBrutaPercentual: number;
  receitaComCustoApurado: number;
  coberturaCustoPercentual: number;
  quantidadeItens: number;
}

export interface MargemPorClienteDTO {
  clienteId: string;
  codigo: string;
  loja: string;
  nome: string;
  receita: number;
  custo: number;
  margemValor: number;
  margemPercentual: number;
  possuiCustoApurado: boolean;
}

export interface MargemPorPeriodoDTO {
  competencia: string; // "YYYY-MM"
  receita: number;
  custo: number;
  margemValor: number;
  margemPercentual: number;
}

export interface MargemResponseDTO {
  kpis: MargemKpiDTO;
  porCliente: MargemPorClienteDTO[];
  evolucaoTemporal: MargemPorPeriodoDTO[];
}
