import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDias, formatMesAno } from "../utils/formatPrazo";
import type { PrazoMesViewModel } from "../types";

interface PrazoGraficoMensalProps {
  evolucao: PrazoMesViewModel[];
}

export function PrazoGraficoMensal({ evolucao }: PrazoGraficoMensalProps) {
  if (evolucao.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base font-semibold">Evolução Mensal do PMR vs PMP</CardTitle></CardHeader>
        <CardContent className="h-40 flex items-center justify-center text-sm text-muted-foreground">
          Nenhum dado apurado para o período selecionado.
        </CardContent>
      </Card>
    );
  }

  const maiorPrazo = Math.max(
    ...evolucao.map((p) => Math.max(p.pmrConcedido ?? 0, p.pmrRealizado ?? 0, p.pmpConcedido ?? 0, p.pmpRealizado ?? 0)),
    30
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <CardTitle className="text-base font-semibold">Evolução Mensal: PMR vs PMP</CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" /> PMR Conc.</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> PMR Real.</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm" /> PMP Conc.</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-teal-500 rounded-sm" /> PMP Real.</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {evolucao.map((p) => {
            const wConc = Math.min(100, Math.round(((p.pmrConcedido ?? 0) / maiorPrazo) * 100));
            const wReal = Math.min(100, Math.round(((p.pmrRealizado ?? 0) / maiorPrazo) * 100));
            const wPmpC = Math.min(100, Math.round(((p.pmpConcedido ?? 0) / maiorPrazo) * 100));
            const wPmpR = Math.min(100, Math.round(((p.pmpRealizado ?? 0) / maiorPrazo) * 100));

            return (
              <div key={p.competencia} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="font-semibold text-slate-700">{formatMesAno(p.competencia)}</span>
                  <span className="text-muted-foreground text-[11px]">
                    PMR: {formatDias(p.pmrRealizado || p.pmrConcedido)} | PMP: {formatDias(p.pmpRealizado || p.pmpConcedido)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all" style={{ width: `${wConc}%` }} />
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${wReal}%` }} />
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all" style={{ width: `${wPmpC}%` }} />
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-teal-500 h-full transition-all" style={{ width: `${wPmpR}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
