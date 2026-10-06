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
  clienteAtivo: string;
  onSelecionarCliente: (nome: string) => void;
}

export function FiliaisTable({
  filiais,
  filtrados,
  loading,
  clienteAtivo,
  onSelecionarCliente,
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
              key={f.id || `${f.codigoEmpresa}-${f.codigoFilial}-${i}`}
              f={f}
              isFiltroAtivo={clienteAtivo === f.nome}
              onSelecionarCliente={onSelecionarCliente}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}