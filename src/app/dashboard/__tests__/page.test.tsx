import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DashboardPage from "../page";

// Mock the child components and hooks to isolate the dashboard layout test
vi.mock("@/hooks/useDashboard", () => ({
  useDashboard: vi.fn(() => ({
    data: {
      clientes: [],
      grupos: [],
      totalClientes: 10,
      faturamentoTotal: 1000,
      valorVencido: 100,
      ticketMedio: 100,
      faturamentoMes: [],
      faturamentoCliente: [],
      regiaoParticipacao: [],
      projecao: [],
      faturamentos: []
    },
    loading: false,
    error: null
  }))
}));

vi.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: () => <div data-testid="dashboard-header" />
}));

vi.mock("@/components/dashboard/DashboardFilterBar", () => ({
  DashboardFilterBar: () => <div data-testid="dashboard-filter-bar" />
}));

vi.mock("@/components/dashboard/DashboardKpiCards", () => ({
  DashboardKpiCards: () => <div data-testid="dashboard-kpi-cards" />
}));

vi.mock("@/components/dashboard/DashboardChartsGrid", () => ({
  DashboardChartsGrid: ({ type }: { type: string }) => <div data-testid={`dashboard-charts-${type}`} />
}));

vi.mock("@/components/dashboard/DashboardInvoicesTable", () => ({
  DashboardInvoicesTable: () => <div data-testid="dashboard-invoices-table" />
}));

vi.mock("@/components/upload/UploadPanel", () => ({
  UploadPanel: () => <div data-testid="upload-panel" />
}));

describe("DashboardPage Layout", () => {
  it("should render the header and filter bar on all tabs", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("dashboard-header")).toBeDefined();
    expect(screen.getByTestId("dashboard-filter-bar")).toBeDefined();
  });

  it("should render the Faturamento view by default", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("dashboard-kpi-cards")).toBeDefined();
    expect(screen.getByTestId("dashboard-charts-faturamento")).toBeDefined();
    
    // Projecao and Atualizacao should not be visible
    expect(screen.queryByTestId("dashboard-charts-projecao")).toBeNull();
    expect(screen.queryByTestId("upload-panel")).toBeNull();
  });

  it("should switch to Projecao view when tab is clicked", () => {
    render(<DashboardPage />);
    
    // Find the Projeção financeira tab button
    const projecaoTab = screen.getByText(/Projeção financeira/i);
    fireEvent.click(projecaoTab);
    
    // Now projecao charts should be visible, others hidden
    expect(screen.getByTestId("dashboard-charts-projecao")).toBeDefined();
    expect(screen.queryByTestId("dashboard-kpi-cards")).toBeNull();
    expect(screen.queryByTestId("dashboard-charts-faturamento")).toBeNull();
  });

  it("should switch to Atualizacao view when tab is clicked", () => {
    render(<DashboardPage />);
    
    // Find the Atualização tab button
    const atualizacaoTab = screen.getByText(/Atualização/i);
    fireEvent.click(atualizacaoTab);
    
    // Upload panel and Invoices table should be visible
    expect(screen.getByTestId("upload-panel")).toBeDefined();
    expect(screen.getByTestId("dashboard-invoices-table")).toBeDefined();
    
    // Others hidden
    expect(screen.queryByTestId("dashboard-charts-faturamento")).toBeNull();
    expect(screen.queryByTestId("dashboard-charts-projecao")).toBeNull();
  });
});
