import React from "react";

export function ActiveFiltersBadge({ cliente, dataInicial, dataFinal }: { cliente: string; dataInicial: string; dataFinal: string }) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 px-3 py-1.5 rounded-md">
      <span className="font-semibold">Filtros aplicados:</span>
      {cliente && <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">Cliente: {cliente}</span>}
      {dataInicial && <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">De: {dataInicial}</span>}
      {dataFinal && <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">Até: {dataFinal}</span>}
    </div>
  );
}
