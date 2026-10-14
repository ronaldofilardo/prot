export interface ItemCalculoMargem {
  receita: number;
  custo: number;
}

export interface MetricasMargemResultado {
  receitaTotal: number;
  custoTotal: number;
  margemBrutaValor: number;
  margemBrutaPercentual: number;
  receitaComCustoApurado: number;
  coberturaCustoPercentual: number;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundPercent(value: number): number {
  return Math.round(value * 10000) / 100;
}

export function calcularMetricasMargem(itens: ItemCalculoMargem[]): MetricasMargemResultado {
  let receitaTotal = 0;
  let custoTotal = 0;
  let receitaComCustoApurado = 0;
  let custoApurado = 0;

  for (const item of itens) {
    const r = item.receita || 0;
    const c = item.custo || 0;

    receitaTotal += r;
    custoTotal += c;

    if (c > 0) {
      receitaComCustoApurado += r;
      custoApurado += c;
    }
  }

  const margemBrutaValor = receitaTotal - custoTotal;

  // Itens com custo = 0 são excluídos do percentual de margem para evitar 100% artificial
  const margemBrutaPercentual =
    receitaComCustoApurado > 0
      ? ((receitaComCustoApurado - custoApurado) / receitaComCustoApurado) * 100
      : 0;

  const coberturaCustoPercentual =
    receitaTotal > 0 ? (receitaComCustoApurado / receitaTotal) * 100 : 0;

  return {
    receitaTotal: roundMoney(receitaTotal),
    custoTotal: roundMoney(custoTotal),
    margemBrutaValor: roundMoney(margemBrutaValor),
    margemBrutaPercentual: roundMoney(margemBrutaPercentual),
    receitaComCustoApurado: roundMoney(receitaComCustoApurado),
    coberturaCustoPercentual: roundMoney(coberturaCustoPercentual),
  };
}
