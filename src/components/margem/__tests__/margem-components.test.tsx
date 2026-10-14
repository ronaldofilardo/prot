import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MargemCardsKpi } from "../common/MargemCardsKpi";
import { MargemAlertaSemCusto } from "../common/MargemAlertaSemCusto";
import { MargemGraficoTemporal } from "../common/MargemGraficoTemporal";
import { MargemTabelaClientes } from "../common/MargemTabelaClientes";
import { MargemComponent } from "../margem-component";
import * as useMargemModule from "../hooks/useMargem";

const mockKpis = {
  receitaTotal: 1000,
  custoTotal: 400,
  margemBrutaValor: 600,
  margemBrutaPercentual: 60,
  receitaComCustoApurado: 1000,
  coberturaCustoPercentual: 100,
  quantidadeItens: 10,
};

const mockKpisSemCusto = {
  receitaTotal: 1000,
  custoTotal: 0,
  margemBrutaValor: 1000,
  margemBrutaPercentual: 0,
  receitaComCustoApurado: 0,
  coberturaCustoPercentual: 0,
  quantidadeItens: 5,
};

describe("MargemCardsKpi", () => {
  it("renderiza metricas normais quando ha custo", () => {
    render(<MargemCardsKpi kpis={mockKpis} />);
    expect(screen.getByText("Receita Faturada (SD2)")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
  });

  it("renderiza indicador Sem CMV quando custo é zero", () => {
    render(<MargemCardsKpi kpis={mockKpisSemCusto} />);
    expect(screen.getByText("— (Sem CMV)")).toBeInTheDocument();
  });
});

describe("MargemAlertaSemCusto", () => {
  it("renderiza texto explicativo sobre servicos e D2_CUSTO1", () => {
    render(<MargemAlertaSemCusto />);
    expect(screen.getByText(/Notas de Prestação de Serviços/)).toBeInTheDocument();
    expect(screen.getByText(/D2_CUSTO1/)).toBeInTheDocument();
  });
});

describe("MargemGraficoTemporal", () => {
  it("renderiza estado vazio quando lista vazia", () => {
    render(<MargemGraficoTemporal evolucao={[]} />);
    expect(screen.getByText(/Nenhum dado apurado/)).toBeInTheDocument();
  });

  it("renderiza periodos com e sem CMV formatados", () => {
    const evolucao = [
      { competencia: "2023-01", receita: 500, custo: 200, margemValor: 300, margemPercentual: 60 },
      { competencia: "2023-02", receita: 500, custo: 0, margemValor: 500, margemPercentual: 0 },
    ];
    render(<MargemGraficoTemporal evolucao={evolucao} />);
    expect(screen.getByText(/Jan\/23/)).toBeInTheDocument();
    expect(screen.getByText(/\(Sem CMV\)/)).toBeInTheDocument();
  });
});

describe("MargemTabelaClientes", () => {
  const clientes = [
    { clienteId: "1", codigo: "001", loja: "01", nome: "Cliente Alpha", receita: 1000, custo: 200, margemValor: 800, margemPercentual: 80, possuiCustoApurado: true },
    { clienteId: "2", codigo: "002", loja: "01", nome: "Cliente Beta", receita: 500, custo: 0, margemValor: 500, margemPercentual: 0, possuiCustoApurado: false },
  ];

  it("filtra clientes pela busca", () => {
    render(<MargemTabelaClientes clientes={clientes} />);
    expect(screen.getByText("Cliente Alpha")).toBeInTheDocument();
    expect(screen.getByText("Cliente Beta")).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Buscar por cliente/);
    fireEvent.change(input, { target: { value: "Alpha" } });

    expect(screen.getByText("Cliente Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Cliente Beta")).not.toBeInTheDocument();
  });
});

describe("MargemComponent", () => {
  it("renderiza alerta de servico quando custo total e zero", () => {
    vi.spyOn(useMargemModule, "useMargem").mockReturnValue({
      data: { kpis: mockKpisSemCusto, porCliente: [], evolucaoTemporal: [] },
      loading: false,
      error: null,
      recarregar: vi.fn(),
      filtros: {},
      setFiltros: vi.fn(),
    });

    render(<MargemComponent />);
    expect(screen.getByText(/Notas de Prestação de Serviços/)).toBeInTheDocument();
  });
});
