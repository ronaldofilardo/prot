import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardChartsGrid } from "../DashboardChartsGrid";

// Mock child components
vi.mock("@/components/charts", () => ({
  FaturamentoTempoChart: () => <div data-testid="chart-faturamento-tempo" />,
  FaturamentoClienteChart: () => <div data-testid="chart-faturamento-cliente" />,
  ParticipacaoDonutChart: () => <div data-testid="chart-participacao" />,
  ProjecaoAreaChart: () => <div data-testid="chart-projecao" />
}));

const mockData = {
  faturamentoMes: [],
  faturamentoCliente: [],
  regiaoParticipacao: [],
  projecao: []
};

describe("DashboardChartsGrid", () => {
  it("should render all charts when type is 'all' or undefined", () => {
    const { rerender } = render(<DashboardChartsGrid data={mockData} loading={false} />);
    
    expect(screen.getByTestId("chart-faturamento-tempo")).toBeInTheDocument();
    expect(screen.getByTestId("chart-faturamento-cliente")).toBeInTheDocument();
    expect(screen.getByTestId("chart-participacao")).toBeInTheDocument();
    expect(screen.getByTestId("chart-projecao")).toBeInTheDocument();

    rerender(<DashboardChartsGrid data={mockData} loading={false} type="all" />);
    
    expect(screen.getByTestId("chart-faturamento-tempo")).toBeInTheDocument();
    expect(screen.getByTestId("chart-faturamento-cliente")).toBeInTheDocument();
    expect(screen.getByTestId("chart-participacao")).toBeInTheDocument();
    expect(screen.getByTestId("chart-projecao")).toBeInTheDocument();
  });

  it("should render only faturamento charts when type is 'faturamento'", () => {
    render(<DashboardChartsGrid data={mockData} loading={false} type="faturamento" />);
    
    expect(screen.getByTestId("chart-faturamento-tempo")).toBeInTheDocument();
    expect(screen.getByTestId("chart-faturamento-cliente")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-participacao")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chart-projecao")).not.toBeInTheDocument();
  });

  it("should render only projecao charts when type is 'projecao'", () => {
    render(<DashboardChartsGrid data={mockData} loading={false} type="projecao" />);
    
    expect(screen.queryByTestId("chart-faturamento-tempo")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chart-faturamento-cliente")).not.toBeInTheDocument();
    expect(screen.getByTestId("chart-participacao")).toBeInTheDocument();
    expect(screen.getByTestId("chart-projecao")).toBeInTheDocument();
  });

  it("should display skeleton when loading is true", () => {
    render(<DashboardChartsGrid data={null} loading={true} />);
    
    // Skeleton elements are rendered inside the ChartCard when loading=true
    // We mock the charts, so if loading is true, the mock charts shouldn't be rendered
    expect(screen.queryByTestId("chart-faturamento-tempo")).not.toBeInTheDocument();
    
    // There are 4 skeleton loaders
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(4);
  });
});
