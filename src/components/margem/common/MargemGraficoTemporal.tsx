import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatMesAno, formatPercent } from "../utils/formatMargem";
import type { MargemPeriodoViewModel } from "../types";

interface MargemGraficoTemporalProps {
  evolucao: MargemPeriodoViewModel[];
}

export function MargemGraficoTemporal({ evolucao }: MargemGraficoTemporalProps) {
  if (evolucao.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Evolução da Margem</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          Nenhum dado apurado para o período selecionado.
        </CardContent>
      </Card>
    );
  }

  const maiorReceita = Math.max(...evolucao.map((p) => p.receita), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Evolução Mensal da Margem</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {evolucao.map((p) => {
            const percReceita = Math.min(100, Math.round((p.receita / maiorReceita) * 100));
            const percCusto = Math.min(100, Math.round((p.custo / maiorReceita) * 100));

            return (
              <div key={p.competencia} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="font-semibold text-slate-700">{formatMesAno(p.competencia)}</span>
                  <span className="text-muted-foreground">
                    Receita: {formatBRL(p.receita)} | Margem: {formatBRL(p.margemValor)} {p.custo > 0 ? `(${formatPercent(p.margemPercentual)})` : "(Sem CMV)"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${percReceita}%` }} title={`Receita: ${formatBRL(p.receita)}`} />
                  <div className="bg-slate-400 h-full transition-all opacity-80" style={{ width: `${percCusto}%` }} title={`Custo: ${formatBRL(p.custo)}`} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
