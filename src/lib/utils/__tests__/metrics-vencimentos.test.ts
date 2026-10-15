import { describe, expect, it } from "vitest";
import { calcularFaixasVencimento } from "../metrics-vencimentos";

describe("metrics-vencimentos (Aging / Faixas a Vencer)", () => {
  const ref = new Date("2026-06-01T00:00:00.000Z");

  it("classifica títulos corretamente nas 5 faixas a partir de uma data de referência", () => {
    const titulos = [
      { saldo: 1000, vencimento: "2026-05-15T00:00:00.000Z" }, // -17 dias: Vencido
      { saldo: 2000, vencimento: "2026-06-10T00:00:00.000Z" }, // +9 dias: 0 a 30 dias
      { saldo: 3000, vencimento: "2026-07-15T00:00:00.000Z" }, // +44 dias: 31 a 60 dias
      { saldo: 4000, vencimento: "2026-08-15T00:00:00.000Z" }, // +75 dias: 61 a 90 dias
      { saldo: 5000, vencimento: "2026-10-01T00:00:00.000Z" }, // +122 dias: Mais de 90 dias
    ];

    const resumo = calcularFaixasVencimento(titulos, ref);

    expect(resumo.totalGeral).toBe(15000);
    expect(resumo.totalVencido).toBe(1000);
    expect(resumo.totalAVencer).toBe(14000);
    expect(resumo.quantidadeTotal).toBe(5);

    expect(resumo.faixas).toEqual([
      { faixa: "Vencido", quantidade: 1, valorTotal: 1000, percentual: 6.7 },
      { faixa: "0 a 30 dias", quantidade: 1, valorTotal: 2000, percentual: 13.3 },
      { faixa: "31 a 60 dias", quantidade: 1, valorTotal: 3000, percentual: 20 },
      { faixa: "61 a 90 dias", quantidade: 1, valorTotal: 4000, percentual: 26.7 },
      { faixa: "Mais de 90 dias", quantidade: 1, valorTotal: 5000, percentual: 33.3 },
    ]);
  });

  it("ignora títulos com saldo zerado ou negativo", () => {
    const titulos = [
      { saldo: 0, vencimento: "2026-06-10T00:00:00.000Z" },
      { saldo: -50, vencimento: "2026-06-10T00:00:00.000Z" },
      { saldo: 500, vencimento: "2026-06-10T00:00:00.000Z" },
    ];

    const resumo = calcularFaixasVencimento(titulos, ref);
    expect(resumo.quantidadeTotal).toBe(1);
    expect(resumo.totalGeral).toBe(500);
    expect(resumo.faixas.find((f) => f.faixa === "0 a 30 dias")?.valorTotal).toBe(500);
  });

  it("retorna faixas zeradas sem erro para lista vazia", () => {
    const resumo = calcularFaixasVencimento([], ref);
    expect(resumo.totalGeral).toBe(0);
    expect(resumo.totalVencido).toBe(0);
    expect(resumo.totalAVencer).toBe(0);
    expect(resumo.quantidadeTotal).toBe(0);
    expect(resumo.faixas).toHaveLength(5);
    expect(resumo.faixas.every((f) => f.quantidade === 0 && f.valorTotal === 0 && f.percentual === 0)).toBe(true);
  });
});
