"use client";

import { DashboardKpiCards } from "@/components/dashboard/DashboardKpiCards";
import { DashboardChartsGrid } from "@/components/dashboard/DashboardChartsGrid";
import { DashboardAtualizacaoTab } from "@/components/dashboard/DashboardAtualizacaoTab";
import { EmpresaProtheusPanel } from "@/components/empresa/EmpresaProtheusPanel";
import type { TabType } from "@/components/dashboard/DashboardSidebarNav";
import type { DashboardData } from "@/hooks/useDashboard";
import { buildChartsData, buildKpiData } from "@/components/dashboard/dashboard-tab-data";

interface DashboardTabPanelProps {
  activeTab: TabType;
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function DashboardTabPanel({ activeTab, data, loading, onRefresh }: DashboardTabPanelProps) {
  const chartsData = buildChartsData(data);

  return (
    <main className="flex-1 min-w-0">
      {activeTab === "faturamento" && (
        <>
          <DashboardKpiCards data={buildKpiData(data)} loading={loading} />
          <DashboardChartsGrid type="faturamento" data={chartsData} loading={loading} />
        </>
      )}

      {activeTab === "projecao" && (
        <DashboardChartsGrid type="projecao" data={chartsData} loading={loading} />
      )}

      {activeTab === "atualizacao" && (
        <DashboardAtualizacaoTab
          faturamentos={data?.faturamentos || []}
          loading={loading}
          onRefresh={onRefresh}
        />
      )}

      {activeTab === "empresa" && <EmpresaProtheusPanel />}
    </main>
  );
}
