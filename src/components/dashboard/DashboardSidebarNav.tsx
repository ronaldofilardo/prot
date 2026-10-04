import React from "react";
import { BarChart3, TrendingUp, RefreshCw, Building2 } from "lucide-react";

export type TabType = "faturamento" | "projecao" | "atualizacao" | "empresa";

interface DashboardSidebarNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

const TABS = [
  { id: "faturamento", label: "Faturamento", icon: <BarChart3 size={18} /> },
  { id: "projecao", label: "Projeção financeira", icon: <TrendingUp size={18} /> },
  { id: "atualizacao", label: "Atualização", icon: <RefreshCw size={18} /> },
  { id: "empresa", label: "Dados da Empresa", icon: <Building2 size={18} /> },
] as const;

export function DashboardSidebarNav({ activeTab, onSelectTab }: DashboardSidebarNavProps) {
  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
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
  );
}
