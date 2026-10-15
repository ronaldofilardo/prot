import { describe, it, expect } from "vitest";
import {
  diasEntre,
  calcularPrazoConcedido,
  calcularPrazoRealizado,
} from "../metrics-prazo-medio";

describe("metrics-prazo-medio", () => {
  describe("diasEntre", () => {
    it("calcula a diferença exata de dias em UTC", () => {
      expect(diasEntre("2026-03-01", "2026-03-31")).toBe(30);
      expect(diasEntre("2026-04-10", "2026-04-10")).toBe(0);
      expect(diasEntre("2026-04-15", "2026-04-10")).toBe(-5);
    });
  });

  describe("calcularPrazoConcedido", () => {
    it("calcula média ponderada pelo valor", () => {
      // Título 1: R$ 1.000, 30 dias -> 30.000
      // Título 2: R$ 3.000, 60 dias -> 180.000
      // Total valor: 4.000, Soma ponderada: 210.000 -> 210.000 / 4.000 = 52.5 dias
      const titulos = [
        { valor: 1000, dataEmissao: "2026-01-01", vencimento: "2026-01-31" },
        { valor: 3000, dataEmissao: "2026-01-01", vencimento: "2026-03-02" },
      ];
      const res = calcularPrazoConcedido(titulos);
      expect(res.prazoMedio).toBe(52.5);
      expect(res.valorTotal).toBe(4000);
      expect(res.quantidade).toBe(2);
    });

    it("retorna null quando não há títulos ou soma é zero", () => {
      expect(calcularPrazoConcedido([]).prazoMedio).toBeNull();
      expect(calcularPrazoConcedido([{ valor: 0, dataEmissao: "2026-01-01", vencimento: "2026-01-31" }]).prazoMedio).toBeNull();
    });
  });

  describe("calcularPrazoRealizado", () => {
    it("calcula prazo realizado ponderado, atraso médio e percentual em atraso", () => {
      // Baixa 1: R$ 2.000, emissão 01/01, vencimento 31/01, baixa 20/01 (-11 dias adiantado, 19 dias realizado)
      // Baixa 2: R$ 2.000, emissão 01/01, vencimento 31/01, baixa 10/02 (+10 dias atrasado, 40 dias realizado)
      // Total baixas: 4.000
      // Realizado: (2000*19 + 2000*40) / 4000 = 118.000 / 4000 = 29.5 dias
      // Atraso médio: (2000*-11 + 2000*10) / 4000 = -2000 / 4000 = -0.5 dia
      // % pago em atraso: 2000 / 4000 = 50%
      const baixas = [
        { valorBaixa: 2000, dataEmissao: "2026-01-01", vencimento: "2026-01-31", dataBaixa: "2026-01-20" },
        { valorBaixa: 2000, dataEmissao: "2026-01-01", vencimento: "2026-01-31", dataBaixa: "2026-02-10" },
      ];
      const res = calcularPrazoRealizado(baixas);
      expect(res.prazoRealizado).toBe(29.5);
      expect(res.atrasoMedio).toBe(-0.5);
      expect(res.percentualAtraso).toBe(50);
      expect(res.valorTotalBaixas).toBe(4000);
      expect(res.quantidade).toBe(2);
    });

    it("retorna null quando denominador é zero", () => {
      const res = calcularPrazoRealizado([]);
      expect(res.prazoRealizado).toBeNull();
      expect(res.atrasoMedio).toBeNull();
      expect(res.percentualAtraso).toBeNull();
    });
  });
});
