export interface PrazoMedioFiltrosDTO {
  dataInicio?: string;
  dataFim?: string;
  filial?: string;
  clienteId?: string;
  empresaIds: string[];
}

export interface PrazoMedioKpisDTO {
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

export interface PrazoPorClienteDTO {
  clienteId: string;
  codigo: string;
  loja: string;
  nome: string;
  valorTotal: number;
  pmrConcedido: number | null;
  pmrRealizado: number | null;
  atrasoMedio: number | null;
}

export interface PrazoPorFornecedorDTO {
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

export interface PrazoPorMesDTO {
  competencia: string; // "YYYY-MM"
  pmrConcedido: number | null;
  pmrRealizado: number | null;
  pmpConcedido: number | null;
  pmpRealizado: number | null;
  valorTitulos: number;
  valorBaixas: number;
  valorTitulosPagar: number;
  valorBaixasPagar: number;
}

export interface PrazoTipoInfoDTO {
  tipo: string;
  quantidade: number;
  total: number;
  considerado: boolean;
}

export type { AgingResumoDTO, FaixaVencimentoDTO, FaixaKey } from "@/lib/utils/metrics-vencimentos";
import type { AgingResumoDTO } from "@/lib/utils/metrics-vencimentos";

export interface PrazoMedioResponseDTO {
  kpis: PrazoMedioKpisDTO;
  porCliente: PrazoPorClienteDTO[];
  porFornecedor: PrazoPorFornecedorDTO[];
  evolucaoMensal: PrazoPorMesDTO[];
  tiposConsiderados: PrazoTipoInfoDTO[];
  tiposConsideradosPagar: PrazoTipoInfoDTO[];
  agingReceber: AgingResumoDTO;
  agingPagar: AgingResumoDTO;
}
