"use client";

import React from "react";
import { GitBranch } from "lucide-react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";

export function FiliaisHeader({ filiais }: { filiais: ProtheusFilialInfo[] }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <GitBranch size={18} className="text-emerald-600 dark:text-emerald-400" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Carteira de Clientes no Protheus — LC1 Contadores
        </h4>
      </div>
      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        {filiais.length} {filiais.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}
      </span>
    </div>
  );
}