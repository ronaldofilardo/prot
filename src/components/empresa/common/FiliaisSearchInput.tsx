"use client";

import React from "react";
import { Search, X } from "lucide-react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";

interface FiliaisSearchInputProps {
  busca: string;
  setBusca: (v: string) => void;
  filiais: ProtheusFilialInfo[];
  filtrados: ProtheusFilialInfo[];
}

export function FiliaisSearchInput({ busca, setBusca, filiais, filtrados }: FiliaisSearchInputProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="relative flex-1 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar clientes por nome, código ou CNPJ..."
          className="w-full text-xs pl-8 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {busca && (
          <button type="button" onClick={() => setBusca("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>
      <span className="text-[11px] text-slate-400">
        Exibindo {filtrados.length} de {filiais.length} clientes
      </span>
    </div>
  );
}