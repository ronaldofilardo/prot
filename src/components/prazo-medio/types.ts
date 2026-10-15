export interface PrazoMedioKpisViewModel {
  pmrConcedido: number | null;
  pmrRealizado: number | null;
  pmpConcedido: number | null;
  pmpRealizado: number | null;
  atrasoMedio: number | null;
  atrasoMedioPagar: number | null;
  percentualAtraso: number | null;
  percentualAtrasoPagar: number | null;
  valorTotalTitulos: number;
  valorTotalBaixas: number;
  quantidadeTitulos: number;
  quantidadeBaixas: number;
  valorTotalTitulosPagar: number;
  valorTotalBaixasPagar: number;
  quantidadeTitulosPagar: number;
  quantidadeBaixasPagar: number;
}

export interface PrazoClienteViewModel {
  clienteId: string;
  codigo: string;
  loja: string;
  nome: string;
  valorTotal: number;
  pmrConcedido: number | null;
  pmrRealizado: number | null;
  atrasoMedio: number | null;
}

export interface PrazoFornecedorViewModel {
  fornecedorCodigo: string;
  fornecedorLoja: string;
  nome: string;
  valorTotal: number;
  pmpConcedido: number | null;
  pmpRealizado: number | null;
  atrasoMedio: number | null;
  quantidadeTitulos: number;
  quantidadeBaixas: number;
}

export interface PrazoMesViewModel {
  competencia: string;
  pmrConcedido: number | null;
  pmrRealizado: number | null;
  pmpConcedido: number | null;
  pmpRealizado: number | null;
  valorTitulos: number;
  valorBaixas: number;
  valorTitulosPagar: number;
  valorBaixasPagar: number;
}

export interface PrazoTipoViewModel {
  tipo: string;
  quantidade: number;
  total: number;
  considerado: boolean;
}

export interface AgingFaixaViewModel {
  faixa: "Vencido" | "0 a 30 dias" | "31 a 60 dias" | "61 a 90 dias" | "Mais de 90 dias";
  quantidade: number;
  valorTotal: number;
  percentual: number;
}

export interface AgingResumoViewModel {
  faixas: AgingFaixaViewModel[];
  totalVencido: number;
  totalAVencer: number;
  totalGeral: number;
  quantidadeTotal: number;
}

export interface PrazoMedioDataViewModel {
  kpis: PrazoMedioKpisViewModel;
  porCliente: PrazoClienteViewModel[];
  porFornecedor: PrazoFornecedorViewModel[];
  evolucaoMensal: PrazoMesViewModel[];
  tiposConsiderados: PrazoTipoViewModel[];
  tiposConsideradosPagar: PrazoTipoViewModel[];
  agingReceber: AgingResumoViewModel;
  agingPagar: AgingResumoViewModel;
}

export interface PrazoMedioFiltrosViewModel {
  dataInicio?: string;
  dataFim?: string;
  filial?: string;
  clienteId?: string;
  empresaIds?: string[];
}
