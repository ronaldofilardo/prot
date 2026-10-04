"use client";

import { Suspense, useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DashboardSidebarNav, type TabType } from "@/components/dashboard/DashboardSidebarNav";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardTabPanel } from "@/components/dashboard/DashboardTabPanel";

function DashboardContent() {
  const { data, loading, error, carregarDados } = useDashboard();
  const [activeTab, setActiveTab] = useState<TabType>("faturamento");

  if (error) {
    return <DashboardErrorState error={error} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <DashboardHeader />
      <DashboardFilterBar clientes={data?.clientes || []} grupos={data?.grupos || []} />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        <DashboardSidebarNav activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Main Content */}
        <DashboardTabPanel activeTab={activeTab} data={data} loading={loading} onRefresh={carregarDados} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando dashboard...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
