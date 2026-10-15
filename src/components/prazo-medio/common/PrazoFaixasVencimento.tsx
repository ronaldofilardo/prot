import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatPercent } from "../utils/formatPrazo";
import type { AgingResumoViewModel } from "../types";

interface PrazoFaixasVencimentoProps {
  agingReceber: AgingResumoViewModel;
  agingPagar: AgingResumoViewModel;
}

function AgingCard({ titulo, resumo, corBarra }: { titulo: string; resumo: AgingResumoViewModel; corBarra: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
          <CardTitle className="text-base font-semibold">{titulo}</CardTitle>
          <div className="text-xs text-muted-foreground">
            Total em aberto: <span className="font-semibold text-slate-800">{formatBRL(resumo.totalGeral)}</span> ({resumo.quantidadeTotal} tít.)
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-50 rounded-lg text-xs">
          <div>
            <span className="text-muted-foreground">Vencido: </span>
            <span className="font-semibold text-rose-600">{formatBRL(resumo.totalVencido)}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">A vencer: </span>
            <span className="font-semibold text-emerald-600">{formatBRL(resumo.totalAVencer)}</span>
          </div>
        </div>
        <div className="space-y-3">
          {resumo.faixas.map((f) => {
            const isVencido = f.faixa === "Vencido";
            const barBg = isVencido ? "bg-rose-500" : corBarra;
            return (
              <div key={f.faixa} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className={isVencido ? "font-semibold text-rose-700" : "text-slate-700"}>
                    {f.faixa} ({f.quantidade})
                  </span>
                  <span className="text-slate-800">
                    {formatBRL(f.valorTotal)} <span className="text-muted-foreground text-[11px]">({formatPercent(f.percentual)})</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`${barBg} h-full transition-all`} style={{ width: `${Math.min(100, f.percentual)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function PrazoFaixasVencimento({ agingReceber, agingPagar }: PrazoFaixasVencimentoProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AgingCard titulo="Aging Contas a Receber" resumo={agingReceber} corBarra="bg-blue-600" />
      <AgingCard titulo="Aging Contas a Pagar" resumo={agingPagar} corBarra="bg-indigo-600" />
    </div>
  );
}
