import { describe, expect, it } from "vitest";
import { calcularMetricasMargem } from "../metrics-margem";

describe("calcularMetricasMargem (metrics-margem.ts)", () => {
  it("calcula corretamente valores normais de margem bruta e percentual", () => {
    const itens = [
      { receita: 1000, custo: 600 },
      { receita: 2000, custo: 1400 },
    ];
    const res = calcularMetricasMargem(itens);

    expect(res.receitaTotal).toBe(3000);
    expect(res.custoTotal).toBe(2000);
    expect(res.margemBrutaValor).toBe(1000);
    expect(res.margemBrutaPercentual).toBeCloseTo(33.33, 2);
    expect(res.coberturaCustoPercentual).toBe(100);
  });

  it("exclui itens com custo zero do cálculo percentual da margem e reflete na cobertura", () => {
    const itens = [
      { receita: 1000, custo: 600 }, // margem 400
      { receita: 500, custo: 0 },    // sem custo apurado
    ];
    const res = calcularMetricasMargem(itens);

    expect(res.receitaTotal).toBe(1500);
    expect(res.custoTotal).toBe(600);
    expect(res.margemBrutaValor).toBe(900);
    // Margem % deve ser calculada apenas sobre a receita com custo apurado (1000 - 600) / 1000 = 40%
    expect(res.margemBrutaPercentual).toBe(40);
    // Cobertura: 1000 / 1500 = 66.67%
    expect(res.coberturaCustoPercentual).toBeCloseTo(66.67, 2);
  });

  it("retorna zeros com segurança para array vazia sem divisao por zero", () => {
    const res = calcularMetricasMargem([]);
    expect(res.receitaTotal).toBe(0);
    expect(res.custoTotal).toBe(0);
    expect(res.margemBrutaValor).toBe(0);
    expect(res.margemBrutaPercentual).toBe(0);
    expect(res.coberturaCustoPercentual).toBe(0);
  });

  it("suporta margem negativa quando o custo supera a receita", () => {
    const itens = [{ receita: 1000, custo: 1200 }];
    const res = calcularMetricasMargem(itens);

    expect(res.receitaTotal).toBe(1000);
    expect(res.custoTotal).toBe(1200);
    expect(res.margemBrutaValor).toBe(-200);
    expect(res.margemBrutaPercentual).toBe(-20);
    expect(res.coberturaCustoPercentual).toBe(100);
  });
});
