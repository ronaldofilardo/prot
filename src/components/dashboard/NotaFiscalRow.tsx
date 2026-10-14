"use client";

import React from "react";
import { FileText } from "lucide-react";

export interface DashboardNotaFiscal {
  id: string;
  filial: string;
  numeroNota: string;
  clienteNome: string;
  clienteCodigo: string;
  dataEmissao: string;
  valorTotal: number;
}

function formatCurrency(val?: number) {
  if (val === undefined || isNaN(val)) return "R$ 0,00";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch {
    return dateStr;
  }
}

function NotaCell({ nf }: { nf: DashboardNotaFiscal }) {
  return (
    <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
      <FileText size={15} className="text-slate-400 dark:text-slate-500" />
      {nf.numeroNota}
    </td>
  );
}

function FilialCell({ nf }: { nf: DashboardNotaFiscal }) {
  const displayFilial = !nf.filial || nf.filial === "undefined" ? "—" : nf.filial;
  return (
    <td className="py-3.5 px-6">
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        {displayFilial}
      </span>
    </td>
  );
}

function ClienteCell({ nf }: { nf: DashboardNotaFiscal }) {
  return (
    <td className="py-3.5 px-6 text-slate-700 dark:text-slate-300">
      <div className="font-medium text-slate-800 dark:text-slate-200">{nf.clienteNome}</div>
      <div className="text-xs text-slate-400 dark:text-slate-500">Cód: {nf.clienteCodigo}</div>
    </td>
  );
}

function DataCell({ nf }: { nf: DashboardNotaFiscal }) {
  return <td className="py-3.5 px-6 text-slate-600 dark:text-slate-400">{formatDate(nf.dataEmissao)}</td>;
}

function ValorCell({ nf }: { nf: DashboardNotaFiscal }) {
  return <td className="py-3.5 px-6 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(nf.valorTotal)}</td>;
}

function StatusCell() {
  return (
    <td className="py-3.5 px-6 text-center">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
        Faturado
      </span>
    </td>
  );
}

export function NotaFiscalRow({ nf }: { nf: DashboardNotaFiscal }) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <NotaCell nf={nf} />
      <FilialCell nf={nf} />
      <ClienteCell nf={nf} />
      <DataCell nf={nf} />
      <ValorCell nf={nf} />
      <StatusCell />
    </tr>
  );
}

export { TableSkeleton } from "./NotaFiscalSkeleton";