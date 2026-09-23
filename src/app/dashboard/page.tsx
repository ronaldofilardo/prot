"use client";

import { Suspense, useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DashboardKpiCards } from "@/components/dashboard/DashboardKpiCards";
import { DashboardChartsGrid } from "@/components/dashboard/DashboardChartsGrid";
import { DashboardInvoicesTable } from "@/components/dashboard/DashboardInvoicesTable";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { BarChart3, TrendingUp, RefreshCw } from "lucide-react";

type TabType = "faturamento" | "projecao" | "atualizacao";

function DashboardContent() {
  const { data, loading, error } = useDashboard();
  const [activeTab, setActiveTab] = useState<TabType>("faturamento");

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 dark:text-red-400 text-xl">!</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Erro ao carregar dados</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "faturamento", label: "Faturamento", icon: <BarChart3 size={18} /> },
    { id: "projecao", label: "Projeção financeira", icon: <TrendingUp size={18} /> },
    { id: "atualizacao", label: "Atualização", icon: <RefreshCw size={18} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <DashboardHeader />
      <DashboardFilterBar clientes={data?.clientes || []} grupos={data?.grupos || []} />
      
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {activeTab === "faturamento" && (
            <>
              <DashboardKpiCards
                data={{
                  totalClientes: data?.totalClientes ?? 0,
                  faturamentoTotal: data?.faturamentoTotal ?? 0,
                  valorVencido: data?.valorVencido ?? 0,
                  ticketMedio: data?.ticketMedio ?? 0,
                }}
                loading={loading}
              />
              <DashboardChartsGrid
                type="faturamento"
                data={data ? {
                  faturamentoMes: data.faturamentoMes,
                  faturamentoCliente: data.faturamentoCliente,
                  regiaoParticipacao: data.regiaoParticipacao,
                  projecao: data.projecao,
                } : null}
                loading={loading}
              />
            </>
          )}

          {activeTab === "projecao" && (
            <DashboardChartsGrid
              type="projecao"
              data={data ? {
                faturamentoMes: data.faturamentoMes,
                faturamentoCliente: data.faturamentoCliente,
                regiaoParticipacao: data.regiaoParticipacao,
                projecao: data.projecao,
              } : null}
              loading={loading}
            />
          )}

          {activeTab === "atualizacao" && (
            <div className="space-y-8">
              <UploadPanel />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Últimas notas fiscais</h3>
                <DashboardInvoicesTable
                  faturamentos={data?.faturamentos || []}
                  loading={loading}
                />
              </div>
            </div>
          )}
        </main>
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
