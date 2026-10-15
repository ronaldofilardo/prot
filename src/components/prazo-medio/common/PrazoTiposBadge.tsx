import React from "react";
import { formatBRL } from "../utils/formatPrazo";
import type { PrazoTipoViewModel } from "../types";

interface PrazoTiposBadgeProps {
  tipos: PrazoTipoViewModel[];
  titulo?: string;
}

export function PrazoTiposBadge({ tipos, titulo }: PrazoTiposBadgeProps) {
  if (tipos.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs space-y-2">
      <div className="flex items-center justify-between text-slate-600 font-medium">
        <span>{titulo || "Tipos de título identificados no Protheus"} ({tipos.length}):</span>
        <span className="text-[11px] text-muted-foreground">Exclusões automáticas: abatimentos (-), adiantamentos e notas de crédito</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tipos.map((t) => (
          <span
            key={t.tipo}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
              t.considerado
                ? "bg-white text-slate-800 border-slate-200 shadow-xs"
                : "bg-slate-100 text-slate-400 border-slate-200 line-through"
            }`}
          >
            <span className="font-semibold">{t.tipo}:</span>
            <span>{t.quantidade} tít.</span>
            <span className="text-muted-foreground">({formatBRL(t.total)})</span>
            {!t.considerado && <span className="text-[10px] text-amber-600 no-underline">(excluído)</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
