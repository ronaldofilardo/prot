"use client";

import { DashboardKpiCards } from "@/components/dashboard/DashboardKpiCards";
import { DashboardChartsGrid } from "@/components/dashboard/DashboardChartsGrid";
import { DashboardAtualizacaoTab } from "@/components/dashboard/DashboardAtualizacaoTab";
import { EmpresaProtheusPanel } from "@/components/empresa/EmpresaProtheusPanel";
import { Balancete } from "@/components/balancete";
import { MargemComponent } from "@/components/margem";
import { PrazoMedioComponent } from "@/components/prazo-medio";
import type { TabType } from "@/components/dashboard/DashboardSidebarNav";
import type { DashboardData } from "@/hooks/useDashboard";
import { buildChartsData, buildKpiData } from "@/components/dashboard/dashboard-tab-data";

interface DashboardTabPanelProps {
  activeTab: TabType;
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

function FaturamentoTabContent({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const chartsData = buildChartsData(data);
  return (
    <>
      <DashboardKpiCards data={buildKpiData(data)} loading={loading} />
      <DashboardChartsGrid type="faturamento" data={chartsData} loading={loading} />
    </>
  );
}

function AtualizacaoTabContent({
  data,
  loading,
  onRefresh,
}: {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const faturamentos = data?.faturamentos ?? [];
  const empresaNome = data?.grupos?.[0]?.nome;
  return (
    <DashboardAtualizacaoTab
      faturamentos={faturamentos}
      loading={loading}
      onRefresh={onRefresh}
      empresaNome={empresaNome}
    />
  );
}

export function DashboardTabPanel({ activeTab, data, loading, onRefresh }: DashboardTabPanelProps) {
  return (
    <main className="flex-1 min-w-0">
      {activeTab === "faturamento" && <FaturamentoTabContent data={data} loading={loading} />}
      {activeTab === "margem" && <MargemComponent />}
      {activeTab === "prazo-medio" && <PrazoMedioComponent />}
      {activeTab === "projecao" && (
        <DashboardChartsGrid type="projecao" data={buildChartsData(data)} loading={loading} />
      )}
      {activeTab === "atualizacao" && (
        <AtualizacaoTabContent data={data} loading={loading} onRefresh={onRefresh} />
      )}
      {activeTab === "empresa" && <EmpresaProtheusPanel />}
      {activeTab === "balancete" && <Balancete />}
    </main>
  );
}
