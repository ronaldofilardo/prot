"use client";

import React from "react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";
import { FilialTableRow } from "./FilialTableRow";
import { FiliaisTableHeader } from "./FiliaisTableHeader";
import { FiliaisLoadingState, FiliaisEmptyState } from "./FiliaisStates";

interface FiliaisTableProps {
  filiais: ProtheusFilialInfo[];
  filtrados: ProtheusFilialInfo[];
  loading?: boolean;
  empresaIdsAtivos: string[];
  onSelecionarFilial: (f: ProtheusFilialInfo) => void;
}

export function FiliaisTable({
  filiais,
  filtrados,
  loading,
  empresaIdsAtivos,
  onSelecionarFilial,
}: FiliaisTableProps) {
  if (loading) return <FiliaisLoadingState />;
  if (filiais.length === 0) return <FiliaisEmptyState />;

  return (
    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
      <table className="w-full text-left text-xs">
        <FiliaisTableHeader />
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtrados.map((f, i) => (
            <FilialTableRow
              key={`${f.codigoEmpresa}-${f.filialCompleta || f.codigoFilial}-${i}`}
              f={f}
              isFiltroAtivo={Boolean(f.empresaVinculadaId) && empresaIdsAtivos.length === 1 && empresaIdsAtivos[0] === f.empresaVinculadaId}
              onSelecionarFilial={onSelecionarFilial}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}