import type { DashboardData } from "@/hooks/useDashboard";
import type { DashboardChartsData } from "./DashboardChartsGrid";
import type { DashboardData as KpiData } from "./DashboardKpiCards";

export function buildChartsData(data: DashboardData | null): DashboardChartsData | null {
  if (!data) return null;
  return {
    faturamentoMes: data.faturamentoMes,
    faturamentoCliente: data.faturamentoCliente,
    regiaoParticipacao: data.regiaoParticipacao,
    projecao: data.projecao,
  };
}

export function buildKpiData(data: DashboardData | null): KpiData {
  return {
    totalClientes: data?.totalClientes ?? 0,
    faturamentoTotal: data?.faturamentoTotal ?? 0,
    valorVencido: data?.valorVencido ?? 0,
    ticketMedio: data?.ticketMedio ?? 0,
  };
}
