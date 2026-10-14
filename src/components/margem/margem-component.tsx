"use client";

import React from "react";
import { useMargem } from "./hooks/useMargem";
import { MargemCardsKpi } from "./common/MargemCardsKpi";
import { MargemAlertaSemCusto } from "./common/MargemAlertaSemCusto";
import { MargemGraficoTemporal } from "./common/MargemGraficoTemporal";
import { MargemTabelaClientes } from "./common/MargemTabelaClientes";
import { Button } from "@/components/ui/button";

export function MargemComponent() {
  const { data, loading, error, recarregar } = useMargem();

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
        Carregando apuração de margem e rentabilidade...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex flex-col items-center gap-3">
        <p className="text-sm font-medium">{error || "Não foi possível carregar os dados de margem."}</p>
        <Button variant="outline" size="sm" onClick={() => recarregar()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const temAlertaServico = data.kpis.custoTotal === 0 && data.kpis.receitaTotal > 0;

  return (
    <div className="space-y-6">
      {temAlertaServico && <MargemAlertaSemCusto />}
      <MargemCardsKpi kpis={data.kpis} />
      <MargemGraficoTemporal evolucao={data.evolucaoTemporal} />
      <MargemTabelaClientes clientes={data.porCliente} />
    </div>
  );
}
