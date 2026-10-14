"use client";

import { CheckCircle2, Hash, Filter, Check } from "lucide-react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";

export function FilialFiltroButton({
  isFiltroAtivo,
  disabled,
  onClick,
}: {
  isFiltroAtivo: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const activeClass = "bg-emerald-600 text-white hover:bg-emerald-700";
  const inactiveClass =
    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isFiltroAtivo ? activeClass : inactiveClass}`}
      title={disabled ? "Filial ainda não vinculada a uma empresa do Dashboard" : "Filtrar dados desta filial no Dashboard"}
    >
      {isFiltroAtivo ? <Check size={11} /> : <Filter size={11} />}
      {isFiltroAtivo ? "Filtrado" : "Filtrar"}
    </button>
  );
}

export function CodCell({ f }: { f: ProtheusFilialInfo }) {
  const cod = f.filialCompleta || f.codigoFilial || "—";
  return (
    <td className="py-2.5 font-mono">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
        <Hash size={11} className="text-slate-400" />
        {cod}
      </span>
    </td>
  );
}

export function NomeCell({ f, isFiltroAtivo }: { f: ProtheusFilialInfo; isFiltroAtivo: boolean }) {
  return (
    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-100">
      <div className="flex items-center gap-2">
        <div>
          <span>{f.nome}</span>
          {f.nomeFilial && <span className="block text-[11px] font-normal text-slate-400">{f.nomeFilial}</span>}
        </div>
        {f.tipo === "Matriz" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-semibold">
            Matriz
          </span>
        )}
        {isFiltroAtivo && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-semibold">
            Filtro Ativo
          </span>
        )}
      </div>
    </td>
  );
}

export function CnpjCell({ f }: { f: ProtheusFilialInfo }) {
  return (
    <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">
      {f.cnpj || "Mesmo da Matriz"}
    </td>
  );
}

export function CidadeCell({ f }: { f: ProtheusFilialInfo }) {
  const texto = [f.cidade, f.uf].filter(Boolean).join(" / ");
  return <td className="py-2.5 text-slate-600 dark:text-slate-400">{texto || "—"}</td>;
}

export function StatusCell({ f }: { f: ProtheusFilialInfo }) {
  return (
    <td className="py-2.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={12} />
        {f.status || "Ativa"}
      </span>
    </td>
  );
}

export function ActionsCell({ isFiltroAtivo, onSelecionarFilial, f }: { isFiltroAtivo: boolean; onSelecionarFilial?: (f: ProtheusFilialInfo) => void; f: ProtheusFilialInfo }) {
  if (!onSelecionarFilial) return <td className="py-2.5 text-right" />;
  return (
    <td className="py-2.5 text-right">
      <FilialFiltroButton isFiltroAtivo={isFiltroAtivo} disabled={!f.empresaVinculadaId} onClick={() => onSelecionarFilial(f)} />
    </td>
  );
}
