import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, CheckCircle2, AlertTriangle, TrendingDown, CreditCard, Wallet } from "lucide-react";
import { formatDias, formatAtraso, formatPercent, formatBRL } from "../utils/formatPrazo";
import type { PrazoMedioKpisViewModel } from "../types";

interface PrazoCardsKpiProps {
  kpis: PrazoMedioKpisViewModel;
}

export function PrazoCardsKpi({ kpis }: PrazoCardsKpiProps) {
  const isAtrasadoRec = (kpis.atrasoMedio ?? 0) > 0;
  const isAtrasadoPag = (kpis.atrasoMedioPagar ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PMR Concedido</p>
            <p className="text-2xl font-bold tracking-tight mt-1 text-slate-800">{formatDias(kpis.pmrConcedido)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatBRL(kpis.valorTotalTitulos)} ({kpis.quantidadeTitulos} tít.)</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CalendarClock size={20} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PMR Realizado</p>
            <p className="text-2xl font-bold tracking-tight mt-1 text-slate-800">{formatDias(kpis.pmrRealizado)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatBRL(kpis.valorTotalBaixas)} ({kpis.quantidadeBaixas} bx.)</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={20} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atraso Recebimento</p>
            <p className={`text-2xl font-bold tracking-tight mt-1 ${isAtrasadoRec ? "text-amber-600" : "text-emerald-600"}`}>
              {formatAtraso(kpis.atrasoMedio)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(kpis.percentualAtraso)} atrasado</p>
          </div>
          <div className={`p-3 rounded-xl ${isAtrasadoRec ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
            {isAtrasadoRec ? <AlertTriangle size={20} /> : <TrendingDown size={20} />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PMP Concedido</p>
            <p className="text-2xl font-bold tracking-tight mt-1 text-indigo-700">{formatDias(kpis.pmpConcedido)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatBRL(kpis.valorTotalTitulosPagar)} ({kpis.quantidadeTitulosPagar} tít.)</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><CreditCard size={20} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PMP Realizado</p>
            <p className="text-2xl font-bold tracking-tight mt-1 text-teal-700">{formatDias(kpis.pmpRealizado)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatBRL(kpis.valorTotalBaixasPagar)} ({kpis.quantidadeBaixasPagar} bx.)</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Wallet size={20} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atraso Pagamento</p>
            <p className={`text-2xl font-bold tracking-tight mt-1 ${isAtrasadoPag ? "text-amber-600" : "text-teal-600"}`}>
              {formatAtraso(kpis.atrasoMedioPagar)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(kpis.percentualAtrasoPagar)} atrasado</p>
          </div>
          <div className={`p-3 rounded-xl ${isAtrasadoPag ? "bg-amber-50 text-amber-600" : "bg-teal-50 text-teal-600"}`}>
            {isAtrasadoPag ? <AlertTriangle size={20} /> : <TrendingDown size={20} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
