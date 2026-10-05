"use client";

import React, { useMemo } from "react";
import type { FilialFiltroDTO } from "@/lib/types/dashboard";
import { listarUFs, filtrarFiliaisPorUF, todasSelecionadas } from "@/lib/utils/filial-selection";

interface FiliaisPanelProps {
  filiais: FilialFiltroDTO[];
  empresaIds: string[];
  ufFiltro: string;
  onUfFiltroChange: (uf: string) => void;
  onAlternarFilial: (filialId: string) => void;
  onAlternarTodas: (marcar: boolean) => void;
}

export function FiliaisPanel({
  filiais,
  empresaIds,
  ufFiltro,
  onUfFiltroChange,
  onAlternarFilial,
  onAlternarTodas,
}: FiliaisPanelProps) {
  const ufs = useMemo(() => listarUFs(filiais), [filiais]);
  const filiaisVisiveis = useMemo(
    () => filtrarFiliaisPorUF(filiais, ufFiltro),
    [filiais, ufFiltro]
  );
  const marcarTodas = todasSelecionadas(filiais, empresaIds);

  return (
    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Filiais</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={marcarTodas}
            onChange={(e) => onAlternarTodas(e.target.checked)}
          />
          Todas
        </label>
      </div>

      {ufs.length > 1 && (
        <select
          value={ufFiltro}
          onChange={(e) => onUfFiltroChange(e.target.value)}
          className="w-full mb-2 px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Todas as UFs</option>
          {ufs.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
        {filiaisVisiveis.map((filial) => (
          <label
            key={filial.id}
            className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 px-2 py-1 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={empresaIds.includes(filial.id)}
              onChange={() => onAlternarFilial(filial.id)}
            />
            {filial.nome} — {filial.cidade}/{filial.uf}
          </label>
        ))}
      </div>

      <p className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
        Vendo {empresaIds.length} de {filiais.length} filiais selecionadas
      </p>
    </div>
  );
}
