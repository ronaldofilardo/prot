import React from "react";
import { GitBranch, Building2, Hash } from "lucide-react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";

export function FilialCodigoBadge({ f }: { f: ProtheusFilialInfo }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono text-xs border border-emerald-200 dark:border-emerald-800">
      <Hash size={12} />
      <span className="font-bold">Filial {f.codigoFilial}</span>
      {f.filialCompleta && f.filialCompleta !== f.codigoFilial && (
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
          ({f.filialCompleta})
        </span>
      )}
    </span>
  );
}

export function FilialTipoBadge({ f }: { f: ProtheusFilialInfo }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
      f.tipo === "Matriz"
        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }`}>
      {f.tipo === "Matriz" ? <Building2 size={11} /> : <GitBranch size={11} />}
      {f.tipo}
    </span>
  );
}
