import React from "react";
import { CheckCircle2, Hash, Filter, Check } from "lucide-react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";

interface FilialTableRowProps {
  f: ProtheusFilialInfo;
  isFiltroAtivo?: boolean;
  onSelecionarCliente?: (nome: string) => void;
}

export function FilialTableRow({ f, isFiltroAtivo = false, onSelecionarCliente }: FilialTableRowProps) {
  const cod = f.id || f.codigoFilial || "—";
  return (
    <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${isFiltroAtivo ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""}`}>
      <td className="py-2.5 font-mono">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
          <Hash size={11} className="text-slate-400" />
          {cod}
        </span>
      </td>
      <td className="py-2.5 font-medium text-slate-800 dark:text-slate-100">
        <div className="flex items-center gap-2">
          <span>{f.nome}</span>
          {isFiltroAtivo && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-semibold">
              Filtro Ativo
            </span>
          )}
        </div>
      </td>
      <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{f.cnpj || "Mesmo da Matriz"}</td>
      <td className="py-2.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={12} />
          {f.status || "Ativa"}
        </span>
      </td>
      <td className="py-2.5 text-right">
        {onSelecionarCliente && (
          <button
            type="button"
            onClick={() => onSelecionarCliente(f.nome)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              isFiltroAtivo
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
            }`}
            title="Filtrar dados deste cliente no Dashboard"
          >
            {isFiltroAtivo ? <Check size={11} /> : <Filter size={11} />}
            {isFiltroAtivo ? "Filtrado" : "Filtrar"}
          </button>
        )}
      </td>
    </tr>
  );
}

