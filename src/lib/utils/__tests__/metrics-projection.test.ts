import { describe, it, expect } from "vitest";
import { formatMesAno, parseMesAno, proximoMes, buildProjecao } from "../metrics-projection";
import type { FaturamentoMes } from "@/lib/types/dashboard";

describe("Projeção e Datas (metrics-projection)", () => {
  it("formata e converte mês e ano UTC corretamente", () => {
    const data = new Date(Date.UTC(2026, 7, 15)); // Agosto
    expect(formatMesAno(data)).toBe("Ago/2026");

    const parsed = parseMesAno("Ago/2026");
    expect(parsed.getUTCFullYear()).toBe(2026);
    expect(parsed.getUTCMonth()).toBe(7);
  });

  it("calcula próximo mês com offset", () => {
    const data = new Date(Date.UTC(2026, 0, 1)); // Jan
    const dataFutura = proximoMes(data, 2);
    expect(formatMesAno(dataFutura)).toBe("Mar/2026");
  });

  it("projeta os próximos 3 meses com média móvel", () => {
    const historico: FaturamentoMes[] = [
      { mes: "Jan/2026", valor: 1000 },
      { mes: "Fev/2026", valor: 2000 },
      { mes: "Mar/2026", valor: 3000 },
    ];

    const projecao = buildProjecao(historico);
    // Deve conter os 3 históricos + 3 projetados
    expect(projecao).toHaveLength(6);
    expect(projecao[0].real).toBe(1000);
    expect(projecao[0].projetado).toBeNull();

    // O último histórico tem o ponto de conexão
    expect(projecao[2].real).toBe(3000);
    expect(projecao[2].projetado).toBe(3000);

    // Próximo mês projetado (Abr/2026) com média de 1000, 2000, 3000 = 2000
    expect(projecao[3].mes).toBe("Abr/2026");
    expect(projecao[3].real).toBeNull();
    expect(projecao[3].projetado).toBe(2000);
  });
});
