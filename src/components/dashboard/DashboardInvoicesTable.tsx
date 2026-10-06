"use client";

import React from "react";
import { RefreshCw, Building2 } from "lucide-react";
import { DashboardNotaFiscal, TableSkeleton, NotaFiscalRow } from "./NotaFiscalRow";
import { InvoicesThead, TableWrapper } from "./common/InvoicesTableParts";

export type { DashboardNotaFiscal };

interface DashboardInvoicesTableProps {
  faturamentos: DashboardNotaFiscal[];
  loading: boolean;
  onRefresh?: () => void;
}

function InvoicesTitleBlock() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Últimas Notas Fiscais — LC1 CONTADORES - MATRIZ
        </h3>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
          <Building2 size={11} />
          Filial 01 (Matriz)
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Notas fiscais faturadas (SF2) da Filial 01 integradas e sincronizadas
        via Protheus ERP
      </p>
    </div>
  );
}

function InvoicesActions({ totalNotas, loading, onRefresh }: { totalNotas: number; loading: boolean; onRefresh?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{totalNotas} nota(s) exibida(s)</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
          title="Recarregar notas fiscais"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      )}
    </div>
  );
}

function InvoicesBody({ faturamentos, loading, totalNotas }: { faturamentos: DashboardNotaFiscal[]; loading: boolean; totalNotas: number }) {
  if (loading) return <TableSkeleton />;
  if (totalNotas === 0) {
    return (
      <tr><td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">Nenhuma nota fiscal encontrada.</td></tr>
    );
  }
  return <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">{faturamentos.map((nf) => <NotaFiscalRow key={nf.id} nf={nf} />)}</tbody>;
}

function HeaderSection({ totalNotas, loading, onRefresh }: { totalNotas: number; loading: boolean; onRefresh?: () => void }) {
  return (
    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
      <InvoicesTitleBlock />
      <InvoicesActions totalNotas={totalNotas} loading={loading} onRefresh={onRefresh} />
    </div>
  );
}

export function DashboardInvoicesTable({ faturamentos, loading, onRefresh }: DashboardInvoicesTableProps) {
  const totalNotas = faturamentos?.length || 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden mb-8">
      <HeaderSection totalNotas={totalNotas} loading={loading} onRefresh={onRefresh} />
      <TableWrapper>
        <InvoicesThead />
        <InvoicesBody faturamentos={faturamentos} loading={loading} totalNotas={totalNotas} />
      </TableWrapper>
    </div>
  );
}