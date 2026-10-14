import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatPercent } from "../utils/formatMargem";
import type { MargemKpiViewModel } from "../types";

interface MargemCardsKpiProps {
  kpis: MargemKpiViewModel;
}

export function MargemCardsKpi({ kpis }: MargemCardsKpiProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Receita Faturada (SD2)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBRL(kpis.receitaTotal)}</div>
          <p className="text-xs text-muted-foreground mt-1">Base apurada na SD2 (D2_TOTAL)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Custo Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-700">{formatBRL(kpis.custoTotal)}</div>
          <p className="text-xs text-muted-foreground mt-1">Custo médio Protheus (D2_CUSTO1)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Margem Bruta (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${kpis.margemBrutaValor >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatBRL(kpis.margemBrutaValor)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Margem %: <span className="font-semibold">{kpis.custoTotal > 0 ? formatPercent(kpis.margemBrutaPercentual) : "— (Sem CMV)"}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cobertura de Custo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-sky-600">{formatPercent(kpis.coberturaCustoPercentual)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatBRL(kpis.receitaComCustoApurado)} com CMV apurado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
