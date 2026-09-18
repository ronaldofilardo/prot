"use client";

import React from "react";
import { TrendingUp, AlertCircle, DollarSign, Users } from "lucide-react";

export interface DashboardData {
  totalClientes: number;
  faturamentoTotal: number;
  valorVencido: number;
  ticketMedio: number;
}

function formatCurrency(val?: number) {
  if (val === undefined || isNaN(val)) return "R$ 0,00";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  colorClass?: string;
}

function KpiCard({ title, value, subtitle, icon, colorClass = "text-slate-900 dark:text-slate-100" }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</span>
        {icon}
      </div>
      <div className={`text-2xl font-black tracking-tight ${colorClass}`}>{value}</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

const Pulse = ({ w = "w-32" }: { w?: string }) => (
  <div className={`h-8 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md ${w} mb-1`} />
);

export function DashboardKpiCards({ data, loading }: { data: DashboardData; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <KpiCard
        title="Faturamento Total"
        value={loading ? <Pulse w="w-36" /> : formatCurrency(data.faturamentoTotal)}
        subtitle="Notas fiscais no período selecionado"
        icon={<span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"><TrendingUp size={18} /></span>}
      />
      <KpiCard
        title="Valor Vencido"
        value={loading ? <Pulse /> : formatCurrency(data.valorVencido)}
        subtitle="Títulos pendentes de liquidação"
        colorClass="text-rose-600 dark:text-rose-400"
        icon={<span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"><AlertCircle size={18} /></span>}
      />
      <KpiCard
        title="Ticket Médio"
        value={loading ? <Pulse /> : formatCurrency(data.ticketMedio)}
        subtitle="Média de valor por nota emitida"
        colorClass="text-blue-600 dark:text-blue-400"
        icon={<span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"><DollarSign size={18} /></span>}
      />
      <KpiCard
        title="Clientes Ativos"
        value={loading ? <Pulse w="w-16" /> : data.totalClientes ?? 0}
        subtitle="Base cadastrada ativa no Protheus"
        colorClass="text-purple-600 dark:text-purple-400"
        icon={<span className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400"><Users size={18} /></span>}
      />
    </div>
  );
}
