"use client";

import React from "react";
import { usePrazoMedio } from "./hooks/usePrazoMedio";
import { PrazoCardsKpi } from "./common/PrazoCardsKpi";
import { PrazoFaixasVencimento } from "./common/PrazoFaixasVencimento";
import { PrazoGraficoMensal } from "./common/PrazoGraficoMensal";
import { PrazoTabelasSecao } from "./common/PrazoTabelasSecao";
import { PrazoTiposBadge } from "./common/PrazoTiposBadge";
import { PrazoLoadingState, PrazoErrorState } from "./common/PrazoFeedbackStates";

export function PrazoMedioComponent() {
  const { data, loading, error, recarregar } = usePrazoMedio();

  if (loading) {
    return <PrazoLoadingState />;
  }

  if (error || !data) {
    return <PrazoErrorState error={error} onRetry={recarregar} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <PrazoTiposBadge tipos={data.tiposConsiderados} titulo="Tipos a Receber (SE1)" />
        <PrazoTiposBadge tipos={data.tiposConsideradosPagar} titulo="Tipos a Pagar (SE2)" />
      </div>
      <PrazoCardsKpi kpis={data.kpis} />
      <PrazoFaixasVencimento agingReceber={data.agingReceber} agingPagar={data.agingPagar} />
      <PrazoGraficoMensal evolucao={data.evolucaoMensal} />
      <PrazoTabelasSecao clientes={data.porCliente} fornecedores={data.porFornecedor} />
    </div>
  );
}
