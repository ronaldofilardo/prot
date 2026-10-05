import type { EmpresaGrupoDTO, FaturamentoItemDTO } from "@/lib/types/dashboard";

export interface DashboardData {
  totalClientes: number;
  clientesAtivosFiltrados: number;
  faturamentoTotal: number;
  valorVencido: number;
  ticketMedio: number;
  faturamentos: FaturamentoItemDTO[];
  faturamentoMes: Array<{ mes: string; valor: number }>;
  faturamentoCliente: Array<{ nome: string; valor: number }>;
  regiaoParticipacao: Array<{ nome: string; valor: number }>;
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

export interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  temFiltroAtivo: boolean;
  carregarDados: () => Promise<void>;
}
