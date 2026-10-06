import React from "react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";

interface EmpresaErpContextProps {
  filial?: ProtheusFilialInfo;
}

export function EmpresaErpContext({ filial }: EmpresaErpContextProps) {
  const codEmpresa = filial?.codigoEmpresa || "001";
  const codUnidade = filial?.codigoUnidade || "01";
  const codFilial = filial?.codigoFilial || "001";
  const filialCompleta = filial?.filialCompleta || "00101001";
  const tipo = filial?.tipo || "Matriz";

  return (
    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
        Parâmetros ERP Protheus (Filial Base)
      </span>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
          Empresa {codEmpresa}
        </span>
        <span className="px-2.5 py-1 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
          Unidade {codUnidade}
        </span>
        <span className="px-2.5 py-1 rounded-md font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
          Filial {codFilial} ({filialCompleta})
        </span>
        <span className="px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-medium">
          Tipo: {tipo}
        </span>
      </div>
    </div>
  );
}
