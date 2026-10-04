import { describe, it, expect } from "vitest";
import {
  getThemeColors,
  buildFaturamentoTempoOption,
  buildFaturamentoClienteOption,
  buildParticipacaoDonutOption,
  buildProjecaoAreaOption,
} from "../dashboardCharts";

describe("Cores de tema ECharts (dashboardCharts/theme)", () => {
  it("alterna cores entre claro e escuro", () => {
    const claro = getThemeColors();
    const escuro = getThemeColors(true);

    expect(claro.textMuted).toBe("#64748b");
    expect(escuro.textMuted).toBe("#94a3b8");
    expect(claro.tooltipBg).toBe("rgba(255, 255, 255, 0.95)");
    expect(escuro.tooltipBg).toBe("rgba(15, 23, 42, 0.95)");
    expect(claro.border).toBe("#cbd5e1");
    expect(escuro.border).toBe("#334155");
    expect(getThemeColors(false)).toEqual(claro);
  });
});

describe("Opção de faturamento no tempo (buildFaturamentoTempoOption)", () => {
  const dados = [
    { mes: "Jan", valor: 2000 },
    { mes: "Fev", valor: 1500000 },
  ];

  it("monta eixo, série e paleta claro", () => {
    const opt = buildFaturamentoTempoOption(dados);

    expect(opt.backgroundColor).toBe("transparent");
    expect(opt.color).toEqual(["#3b82f6"]);
    expect(opt.xAxis.data).toEqual(["Jan", "Fev"]);
    expect(opt.series[0].data).toEqual([2000, 1500000]);
    expect(opt.series[0].name).toBe("Faturamento Real");
    expect(opt.tooltip.backgroundColor).toBe("rgba(255, 255, 255, 0.95)");
  });

  it("formata o tooltip com valor monetário em pt-BR", () => {
    const opt = buildFaturamentoTempoOption(dados, true);
    const html = opt.tooltip.formatter([{ name: "Jan", value: 1500 }]);

    expect(html).toContain("Jan");
    expect(html).toContain("R$ 1.500,00");
    expect(opt.tooltip.backgroundColor).toBe("rgba(15, 23, 42, 0.95)");
  });

  it("formata o eixo Y em milhar, milhão e valor simples", () => {
    const opt = buildFaturamentoTempoOption(dados);
    const fmt = opt.yAxis.axisLabel.formatter;

    expect(fmt(2000)).toBe("R$ 2k");
    expect(fmt(1500000)).toBe("R$ 1.5M");
    expect(fmt(500)).toBe("R$ 500");
  });
});

describe("Opção de faturamento por cliente (buildFaturamentoClienteOption)", () => {
  const dados = [
    ...Array.from({ length: 11 }, (_, i) => ({ nome: `Cliente ${i}`, valor: 100 + i })),
    { nome: "Nome Cliente Grande Demais", valor: 999 },
  ];

  it("limita a série ao top 10 clientes", () => {
    const opt = buildFaturamentoClienteOption(dados);

    expect(opt.xAxis.data).toHaveLength(10);
    expect(opt.series[0].data).toHaveLength(10);
    expect(opt.series[0].type).toBe("bar");
    expect(opt.color).toEqual(["#6366f1"]);
  });

  it("trunca nomes longos no rótulo e mantém curtos", () => {
    const opt = buildFaturamentoClienteOption(dados);
    const fmt = opt.xAxis.axisLabel.formatter;

    expect(fmt("Cliente 0")).toBe("Cliente 0");
    expect(fmt("Nome Cliente Grande Demais")).toBe("Nome Cliente...");
  });

  it("formata tooltip e eixo Y", () => {
    const opt = buildFaturamentoClienteOption(dados);

    expect(opt.tooltip.formatter([{ name: "Ana", value: 1000 }])).toContain("R$ 1.000,00");
    expect(opt.yAxis.axisLabel.formatter(2000)).toBe("R$ 2k");
    expect(opt.yAxis.axisLabel.formatter(1200000)).toBe("R$ 1.2M");
    expect(opt.yAxis.axisLabel.formatter(50)).toBe("R$ 50");
  });
});

describe("Opção de participação por região (buildParticipacaoDonutOption)", () => {
  it("usa cor customizada ou paleta padrão por posição", () => {
    const opt = buildParticipacaoDonutOption([
      { nome: "SP", valor: 50 },
      { nome: "RJ", valor: 30, cor: "#123456" },
      { nome: "MG", valor: 20 },
    ]);

    expect(opt.series[0].data).toEqual([
      { value: 50, name: "SP", itemStyle: { color: "#3b82f6" } },
      { value: 30, name: "RJ", itemStyle: { color: "#123456" } },
      { value: 20, name: "MG", itemStyle: { color: "#a855f7" } },
    ]);
    expect(opt.series[0].itemStyle.borderColor).toBe("#ffffff");
  });

  it("calcula o percentual do tooltip sobre o total", () => {
    const opt = buildParticipacaoDonutOption([
      { nome: "SP", valor: 50 },
      { nome: "RJ", valor: 30 },
    ]);

    expect(opt.tooltip.formatter({ name: "SP", value: 50 })).toContain("(62.5%)");
    expect(opt.tooltip.formatter({ name: "SP", value: "50" })).toContain("R$ 50,00");
  });

  it("cai em 0% quando o total é zero e usa borda escura", () => {
    const opt = buildParticipacaoDonutOption([], true);

    expect(opt.series[0].itemStyle.borderColor).toBe("#0f172a");
    expect(opt.tooltip.formatter({ name: "X", value: 0 })).toContain("(0%)");
  });
});

describe("Opção de projeção (buildProjecaoAreaOption)", () => {
  const dados = [
    { mes: "Jan", real: 100, projetado: null },
    { mes: "Fev", real: 200, projetado: 250 },
  ];

  it("mapeia séries real e projetado preservando nulos", () => {
    const opt = buildProjecaoAreaOption(dados, true);

    expect(opt.xAxis.data).toEqual(["Jan", "Fev"]);
    expect(opt.series[0].data).toEqual([100, 200]);
    expect(opt.series[1].data).toEqual([null, 250]);
    expect(opt.series[0].name).toBe("Histórico Real");
    expect(opt.series[1].name).toBe("Projeção Média Móvel");
    expect(opt.color).toEqual(["#3b82f6", "#a855f7"]);
  });

  it("monta tooltip com axisValue, séries e valores; pula nulos", () => {
    const opt = buildProjecaoAreaOption(dados);
    const html = opt.tooltip.formatter([
      { name: "Jan", axisValue: "Jan/26", value: 100, seriesName: "Histórico Real", color: "#3b82f6" },
      { name: "Jan", value: null as unknown as number, seriesName: "Serie Nula", color: "#a855f7" },
      { name: "Mar", value: 2500.5, seriesName: "Projeção Média Móvel", color: "#a855f7" },
    ]);

    expect(html).toContain("Jan/26");
    expect(html).toContain("Histórico Real");
    expect(html).toContain("R$ 100,00");
    expect(html).toContain("Projeção Média Móvel");
    expect(html).toContain("R$ 2.500,50");
    expect(html).not.toContain("Serie Nula");
  });

  it("usa o nome da série quando axisValue está ausente e formata o eixo", () => {
    const opt = buildProjecaoAreaOption(dados);
    const html = opt.tooltip.formatter([{ name: "Fev", value: 0, seriesName: "Zero", color: "#3b82f6" }]);

    expect(html).toContain("Fev");
    expect(html).toContain("R$ 0,00");
    expect(opt.yAxis.axisLabel.formatter(3000)).toBe("R$ 3k");
    expect(opt.yAxis.axisLabel.formatter(2500000)).toBe("R$ 2.5M");
    expect(opt.yAxis.axisLabel.formatter(10)).toBe("R$ 10");
  });
});
