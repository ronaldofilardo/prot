"use client";

import React from "react";
import { NotaFiscalRow, TableSkeleton, type DashboardNotaFiscal } from "./NotaFiscalRow";

export type { DashboardNotaFiscal };

interface DashboardInvoicesTableProps {
  faturamentos: DashboardNotaFiscal[];
  loading: boolean;
}

export function DashboardInvoicesTable({ faturamentos, loading }: DashboardInvoicesTableProps) {
  const totalNotas = faturamentos?.length || 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden mb-8">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Últimas Notas Fiscais</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Registros emitidos extraídos da base do Protheus (SF2)</p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{totalNotas} nota(s) exibida(s)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nota Fiscal</th>
              <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
              <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Emissão</th>
              <th className="text-right py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Valor Total</th>
              <th className="text-center py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {loading ? (
              <TableSkeleton />
            ) : totalNotas > 0 ? (
              faturamentos.map((nf) => <NotaFiscalRow key={nf.id} nf={nf} />)
            ) : (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
                  Nenhuma nota fiscal encontrada para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
