"use client";

import React from "react";
import {
  FaturamentoTempoChart,
  FaturamentoClienteChart,
  ParticipacaoDonutChart,
  ProjecaoAreaChart,
} from "@/components/charts";

export interface DashboardChartsData {
  faturamentoMes: Array<{ mes: string; valor: number }>;
  faturamentoCliente: Array<{ nome: string; valor: number }>;
  regiaoParticipacao: Array<{ nome: string; valor: number }>;
  projecao: Array<{ mes: string; real: number | null; projetado: number | null }>;
}

interface ChartCardProps {
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, badge, badgeColor, children }: ChartCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-md ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <div className="flex-1 min-h-[280px]">{children}</div>
    </div>
  );
}

const Skeleton = () => (
  <div className="h-[280px] w-full bg-slate-100 dark:bg-slate-800/60 rounded-lg animate-pulse" />
);

export function DashboardChartsGrid({ data, loading }: { data: DashboardChartsData | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <ChartCard title="Faturamento ao Longo do Tempo" subtitle="Evolução mensal agregada do faturamento real" badge="Mensal" badgeColor="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
        {loading ? <Skeleton /> : <FaturamentoTempoChart dados={data?.faturamentoMes || []} />}
      </ChartCard>

      <ChartCard title="Faturamento por Cliente" subtitle="Top clientes com maior volume de compras" badge="Ranking" badgeColor="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
        {loading ? <Skeleton /> : <FaturamentoClienteChart dados={data?.faturamentoCliente || []} />}
      </ChartCard>

      <ChartCard title="Participação por Região" subtitle="Distribuição geográfica de vendas por Estado (UF)" badge="Estados" badgeColor="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
        {loading ? <Skeleton /> : <ParticipacaoDonutChart dados={data?.regiaoParticipacao || []} />}
      </ChartCard>

      <ChartCard title="Projeção Financeira" subtitle="Histórico real e estimativa futura de 3 meses via média móvel" badge="Média Móvel 3M" badgeColor="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
        {loading ? <Skeleton /> : <ProjecaoAreaChart dados={data?.projecao || []} />}
      </ChartCard>
    </div>
  );
}
