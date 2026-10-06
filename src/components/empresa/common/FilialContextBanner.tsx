import React from "react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";

export function FilialContextBanner({ filiais }: { filiais: ProtheusFilialInfo[] }) {
  const primeira = filiais[0];
  const codEmpresa = primeira?.codigoEmpresa || "001";
  const codUnidade = primeira?.codigoUnidade || "01";
  const codFilial = primeira?.codigoFilial || "001";
  const completa = primeira?.filialCompleta || "00101001";

  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
      <span className="font-semibold text-slate-700 dark:text-slate-300">Parâmetros ERP Protheus:</span>
      <span className="px-2 py-0.5 rounded font-mono bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium">
        Empresa {codEmpresa}
      </span>
      <span className="px-2 py-0.5 rounded font-mono bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium">
        Unidade {codUnidade}
      </span>
      <span className="px-2 py-0.5 rounded font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
        Filial {codFilial} ({completa})
      </span>
      <span className="text-slate-400 text-[11px] ml-auto">
        Entidades de faturamento vinculadas ao ERP
      </span>
    </div>
  );
}
