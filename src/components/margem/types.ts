export interface MargemFiltrosViewModel {
  dataInicio?: string;
  dataFim?: string;
  filial?: string;
  clienteId?: string;
  empresaIds?: string[];
}

export interface MargemKpiViewModel {
  receitaTotal: number;
  custoTotal: number;
  margemBrutaValor: number;
  margemBrutaPercentual: number;
  receitaComCustoApurado: number;
  coberturaCustoPercentual: number;
  quantidadeItens: number;
}

export interface MargemClienteViewModel {
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

export interface MargemPeriodoViewModel {
  competencia: string;
  receita: number;
  custo: number;
  margemValor: number;
  margemPercentual: number;
}

export interface MargemDataViewModel {
  kpis: MargemKpiViewModel;
  porCliente: MargemClienteViewModel[];
  evolucaoTemporal: MargemPeriodoViewModel[];
}
