"use client";

import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";
import { CodCell, NomeCell, CnpjCell, CidadeCell, StatusCell, ActionsCell } from "./FilialTableRowCells";

interface FilialTableRowProps {
  f: ProtheusFilialInfo;
  isFiltroAtivo?: boolean;
  onSelecionarFilial?: (f: ProtheusFilialInfo) => void;
}

export function FilialTableRow({ f, isFiltroAtivo = false, onSelecionarFilial }: FilialTableRowProps) {
  const rowClass = isFiltroAtivo ? "bg-emerald-50/40 dark:bg-emerald-950/20" : "";

  return (
    <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${rowClass}`}>
      <CodCell f={f} />
      <NomeCell f={f} isFiltroAtivo={isFiltroAtivo} />
      <CnpjCell f={f} />
      <CidadeCell f={f} />
      <StatusCell f={f} />
      <ActionsCell isFiltroAtivo={isFiltroAtivo} onSelecionarFilial={onSelecionarFilial} f={f} />
    </tr>
  );
}
