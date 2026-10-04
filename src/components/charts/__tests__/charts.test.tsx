import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FaturamentoTempoChart } from "../FaturamentoTempoChart";
import { FaturamentoClienteChart } from "../FaturamentoClienteChart";
import { ParticipacaoDonutChart } from "../ParticipacaoDonutChart";
import { ProjecaoAreaChart } from "../ProjecaoAreaChart";

vi.mock("echarts-for-react", () => ({
  default: ({ option }: { option: Record<string, unknown> }) => (
    <div
      data-testid="echarts"
      data-empty={String(!option || Object.keys(option).length === 0)}
    />
  ),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ isDark: false }),
}));

function expectGraficoVazio(aviso: RegExp) {
  expect(screen.getByText(aviso)).toBeDefined();
  expect(screen.queryByTestId("echarts")).toBeNull();
}

function expectGraficoRenderizado() {
  expect(screen.getByTestId("echarts")).toBeDefined();
  expect(screen.getByTestId("echarts").getAttribute("data-empty")).toBe("false");
}

describe("Gráfico de faturamento no tempo", () => {
  it("mostra aviso sem dados e renderiza o gráfico com dados", () => {
    const { rerender } = render(<FaturamentoTempoChart dados={[]} />);
    expectGraficoVazio(/Nenhum dado dispon.vel no per.odo/);

    rerender(<FaturamentoTempoChart dados={[{ mes: "Jan", valor: 100 }]} />);
    expectGraficoRenderizado();
  });
});

describe("Gráfico de faturamento por cliente", () => {
  it("mostra aviso sem dados e renderiza o gráfico com dados", () => {
    const { rerender } = render(<FaturamentoClienteChart dados={[]} />);
    expectGraficoVazio(/Nenhum cliente encontrado/);

    rerender(<FaturamentoClienteChart dados={[{ nome: "Ana", valor: 50 }]} />);
    expectGraficoRenderizado();
  });
});

describe("Gráfico de participação por região", () => {
  it("mostra aviso sem dados e renderiza o gráfico com dados", () => {
    const { rerender } = render(<ParticipacaoDonutChart dados={[]} />);
    expectGraficoVazio(/Nenhum dado regional no per.odo/);

    rerender(<ParticipacaoDonutChart dados={[{ nome: "SP", valor: 10 }]} />);
    expectGraficoRenderizado();
  });
});

describe("Gráfico de projeção", () => {
  it("mostra aviso sem dados e renderiza o gráfico com dados", () => {
    const { rerender } = render(<ProjecaoAreaChart dados={[]} />);
    expectGraficoVazio(/Nenhum dado para proje..o/);

    rerender(<ProjecaoAreaChart dados={[{ mes: "Jan", real: 1, projetado: 2 }]} />);
    expectGraficoRenderizado();
  });
});
