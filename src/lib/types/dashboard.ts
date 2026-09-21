import type { ClienteDB, FaturamentoDB, ContaReceberDB, DecimalValue } from "./db";

export type { DecimalValue };
export type DecimalLike = DecimalValue;
export type Cliente = ClienteDB;
export type Faturamento = FaturamentoDB;
export type ContaReceber = ContaReceberDB;

export interface DashboardFilters {
  cliente: string;
  dataInicial: string;
  dataFinal: string;
  /** id da empresa matriz selecionada no filtro (null = nenhuma). */
  matrizId: string | null;
  /** empresaId's (filiais) marcados dentro da matriz selecionada. */
  empresaIds: string[];
}

/** Uma filial dentro do filtro de matriz/filiais da UI. */
export interface FilialFiltroDTO {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
}

/** Uma matriz e suas filiais, para popular o seletor de empresa/grupo. */
export interface EmpresaGrupoDTO {
  id: string;
  nome: string;
  cnpj: string | null;
  filiais: FilialFiltroDTO[];
}

export interface FaturamentoMesDTO {
  mes: string;
  valor: number;
}
export type FaturamentoMes = FaturamentoMesDTO;

export interface FaturamentoClienteDTO {
  nome: string;
  valor: number;
}
export type FaturamentoCliente = FaturamentoClienteDTO;

export interface RegiaoParticipacaoDTO {
  nome: string;
  valor: number;
}
export type RegiaoParticipacao = RegiaoParticipacaoDTO;

export interface ProjecaoPontoDTO {
  mes: string;
  real: number | null;
  projetado: number | null;
}
export type ProjecaoPonto = ProjecaoPontoDTO;

export interface FaturamentoItemDTO {
  id: string;
  numeroNota: string;
  clienteNome: string;
  clienteCodigo: string;
  dataEmissao: Date | string;
  valorTotal: number;
}

export interface DashboardResponseDTO {
  totalClientes: number;
  clientesAtivosFiltrados: number;
  faturamentoTotal: number;
  valorVencido: number;
  ticketMedio: number;
  faturamentos: FaturamentoItemDTO[];
  faturamentoMes: FaturamentoMesDTO[];
  faturamentoCliente: FaturamentoClienteDTO[];
  regiaoParticipacao: RegiaoParticipacaoDTO[];
  projecao: ProjecaoPontoDTO[];
  clientes: ClienteDB[];
  /** Matrizes (com suas filiais) do tenant, para o filtro de empresa/grupo. */
  grupos: EmpresaGrupoDTO[];
}
export type DashboardResponse = DashboardResponseDTO;
