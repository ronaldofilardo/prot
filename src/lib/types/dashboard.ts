import type { Decimal } from "@prisma/client/runtime/library";

export interface FaturamentoComCliente {
  id: string;
  filial: string;
  numeroNota: string;
  dataEmissao: Date;
  valorTotal: Decimal;
  clienteId: string;
  empresaId: string;
  sincronizadoEm: Date;
  cliente: {
    id: string;
    nome: string;
    codigo: string;
    estado: string | null;
  };
}

export interface ContaReceberComClienteEBaixas {
  id: string;
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo: string;
  dataEmissao: Date;
  vencimento: Date;
  valor: Decimal;
  clienteId: string;
  empresaId: string;
  sincronizadoEm: Date;
  cliente: {
    id: string;
    nome: string;
    codigo: string;
  };
  baixas: Array<{
    valorBaixa: Decimal;
  }>;
}

export interface FaturamentoMes {
  mes: string;
  valor: number;
}

export interface FaturamentoCliente {
  nome: string;
  valor: number;
}

export interface RegiaoParticipacao {
  nome: string;
  valor: number;
}

export interface FaturamentoItemDTO {
  id: string;
  filial: string;
  numeroNota: string;
  clienteNome: string;
  clienteCodigo: string;
  dataEmissao: string;
  valorTotal: number;
}

export interface EmpresaGrupoDTO {
  id: string;
  nome: string;
  cnpj: string | null;
  filiais: Array<{
    id: string;
    nome: string;
    cidade: string;
    uf: string;
  }>;
}

export interface FilialFiltroDTO {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
}

export interface DashboardFilters {
  cliente: string;
  dataInicial: string;
  dataFinal: string;
  matrizId: string | null;
  empresaIds: string[];
}

export interface DashboardResponse {
  totalClientes: number;
  clientesAtivosFiltrados: number;
  faturamentoTotal: number;
  valorVencido: number;
  ticketMedio: number;
  faturamentos: FaturamentoItemDTO[];
  faturamentoMes: FaturamentoMes[];
  faturamentoCliente: FaturamentoCliente[];
  regiaoParticipacao: RegiaoParticipacao[];
  projecao: Array<{ mes: string; real: number | null; projetado: number | null }>;
  clientes: Array<{
    id: string;
    codigo: string;
    nome: string;
    cidade: string;
    estado: string;
  }>;
  grupos: EmpresaGrupoDTO[];
}

export interface ProjecaoPonto {
  mes: string;
  real: number | null;
  projetado: number | null;
}
