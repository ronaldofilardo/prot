"use client";

import React from "react";
import { FileText } from "lucide-react";

export interface DashboardNotaFiscal {
  id: string;
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

export function NotaFiscalRow({ nf }: { nf: DashboardNotaFiscal }) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <FileText size={15} className="text-slate-400 dark:text-slate-500" />
        {nf.numeroNota}
      </td>
      <td className="py-3.5 px-6 text-slate-700 dark:text-slate-300">
        <div className="font-medium text-slate-800 dark:text-slate-200">{nf.clienteNome}</div>
        <div className="text-xs text-slate-400 dark:text-slate-500">Cód: {nf.clienteCodigo}</div>
      </td>
      <td className="py-3.5 px-6 text-slate-600 dark:text-slate-400">{formatDate(nf.dataEmissao)}</td>
      <td className="py-3.5 px-6 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(nf.valorTotal)}</td>
      <td className="py-3.5 px-6 text-center">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
          Faturado
        </span>
      </td>
    </tr>
  );
}

export function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, idx) => (
        <tr key={idx} className="animate-pulse">
          <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
          <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48" /></td>
          <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
          <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28 ml-auto" /></td>
          <td className="py-4 px-6 text-center"><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-16 mx-auto" /></td>
        </tr>
      ))}
    </>
  );
}
