import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PrazoCardsKpi } from "../common/PrazoCardsKpi";
import { PrazoFaixasVencimento } from "../common/PrazoFaixasVencimento";
import { PrazoGraficoMensal } from "../common/PrazoGraficoMensal";
import { PrazoTabelaClientes } from "../common/PrazoTabelaClientes";
import { PrazoTabelaFornecedores } from "../common/PrazoTabelaFornecedores";
import { PrazoTiposBadge } from "../common/PrazoTiposBadge";
import { PrazoMedioComponent } from "../prazo-medio-component";
import * as usePrazoMedioModule from "../hooks/usePrazoMedio";

const mockKpis = {
  pmrConcedido: 30,
  pmrRealizado: 25.5,
  pmpConcedido: 42.0,
  pmpRealizado: 38.0,
  atrasoMedio: -4.5,
  atrasoMedioPagar: 2.0,
  percentualAtraso: 12.5,
  percentualAtrasoPagar: 15.0,
  valorTotalTitulos: 150000,
  valorTotalBaixas: 120000,
  quantidadeTitulos: 10,
  quantidadeBaixas: 8,
  valorTotalTitulosPagar: 80000,
  valorTotalBaixasPagar: 50000,
  quantidadeTitulosPagar: 6,
  quantidadeBaixasPagar: 5,
};

const mockAging = {
  faixas: [
    { faixa: "Vencido" as const, quantidade: 2, valorTotal: 10000, percentual: 20 },
    { faixa: "0 a 30 dias" as const, quantidade: 5, valorTotal: 40000, percentual: 80 },
    { faixa: "31 a 60 dias" as const, quantidade: 0, valorTotal: 0, percentual: 0 },
    { faixa: "61 a 90 dias" as const, quantidade: 0, valorTotal: 0, percentual: 0 },
    { faixa: "Mais de 90 dias" as const, quantidade: 0, valorTotal: 0, percentual: 0 },
  ],
  totalVencido: 10000,
  totalAVencer: 40000,
  totalGeral: 50000,
  quantidadeTotal: 7,
};

describe("PrazoCardsKpi", () => {
  it("renderiza métricas de PMR concedido, realizado, PMP e atraso", () => {
    render(<PrazoCardsKpi kpis={mockKpis} />);
    expect(screen.getByText("PMR Concedido")).toBeInTheDocument();
    expect(screen.getByText("30,0 dias")).toBeInTheDocument();
    expect(screen.getByText("PMR Realizado")).toBeInTheDocument();
    expect(screen.getByText("25,5 dias")).toBeInTheDocument();
    expect(screen.getByText("PMP Concedido")).toBeInTheDocument();
    expect(screen.getByText("42,0 dias")).toBeInTheDocument();
    expect(screen.getByText("PMP Realizado")).toBeInTheDocument();
    expect(screen.getByText("38,0 dias")).toBeInTheDocument();
    expect(screen.getByText("Atraso Recebimento")).toBeInTheDocument();
    expect(screen.getByText("Atraso Pagamento")).toBeInTheDocument();
    expect(screen.getByText("2,0 d em atraso")).toBeInTheDocument();
  });
});


describe("PrazoTiposBadge", () => {
  it("renderiza badges com status de considerado e excluído", () => {
    const tipos = [
      { tipo: "DUP", quantidade: 10, total: 50000, considerado: true },
      { tipo: "RA", quantidade: 1, total: 5000, considerado: false },
    ];
    render(<PrazoTiposBadge tipos={tipos} />);
    expect(screen.getByText(/DUP:/)).toBeInTheDocument();
    expect(screen.getByText(/RA:/)).toBeInTheDocument();
    expect(screen.getByText("(excluído)")).toBeInTheDocument();
  });
});

describe("PrazoGraficoMensal", () => {
  it("renderiza estado vazio quando lista vazia", () => {
    render(<PrazoGraficoMensal evolucao={[]} />);
    expect(screen.getByText(/Nenhum dado apurado/)).toBeInTheDocument();
  });

  it("renderiza meses com métricas de concedido e realizado", () => {
    const evolucao = [
      {
        competencia: "2026-03",
        pmrConcedido: 30,
        pmrRealizado: 28,
        pmpConcedido: 45,
        pmpRealizado: 40,
        valorTitulos: 5000,
        valorBaixas: 4000,
        valorTitulosPagar: 3000,
        valorBaixasPagar: 2500,
      },
    ];
    render(<PrazoGraficoMensal evolucao={evolucao} />);
    expect(screen.getByText("Mar/2026")).toBeInTheDocument();
  });
});

describe("PrazoTabelaClientes", () => {
  it("renderiza clientes com colunas de prazo", () => {
    const clientes = [
      {
        clienteId: "cli-1",
        codigo: "000001",
        loja: "01",
        nome: "Cliente Alfa",
        valorTotal: 50000,
        pmrConcedido: 30,
        pmrRealizado: 26,
        atrasoMedio: -4,
      },
    ];
    render(<PrazoTabelaClientes clientes={clientes} />);
    expect(screen.getByText("Cliente Alfa")).toBeInTheDocument();
    expect(screen.getByText("30,0 dias")).toBeInTheDocument();
    expect(screen.getByText("26,0 dias")).toBeInTheDocument();
  });
});

describe("PrazoMedioComponent", () => {
  it("exibe loading quando carregando", () => {
    vi.spyOn(usePrazoMedioModule, "usePrazoMedio").mockReturnValue({
      data: null,
      loading: true,
      error: null,
      filtros: {},
      setFiltros: vi.fn(),
      recarregar: vi.fn(),
    });

    render(<PrazoMedioComponent />);
    expect(screen.getByText(/Carregando apuração/)).toBeInTheDocument();
  });

  it("exibe erro e botão de tentar novamente", () => {
    const recarregarMock = vi.fn();
    vi.spyOn(usePrazoMedioModule, "usePrazoMedio").mockReturnValue({
      data: null,
      loading: false,
      error: "Erro na API",
      filtros: {},
      setFiltros: vi.fn(),
      recarregar: recarregarMock,
    });

    render(<PrazoMedioComponent />);
    expect(screen.getByText("Erro na API")).toBeInTheDocument();

    const btn = screen.getByText("Tentar novamente");
    fireEvent.click(btn);
    expect(recarregarMock).toHaveBeenCalled();
  });

  it("permite alternar entre tabela de clientes e fornecedores", () => {
    vi.spyOn(usePrazoMedioModule, "usePrazoMedio").mockReturnValue({
      data: {
        kpis: mockKpis,
        porCliente: [
          {
            clienteId: "cli-1",
            codigo: "001",
            loja: "01",
            nome: "Cliente Alfa",
            valorTotal: 50000,
            pmrConcedido: 30,
            pmrRealizado: 25,
            atrasoMedio: -5,
          },
        ],
        porFornecedor: [
          {
            fornecedorCodigo: "F01",
            fornecedorLoja: "01",
            nome: "Fornecedor Beta",
            valorTotal: 40000,
            pmpConcedido: 45,
            pmpRealizado: 40,
            atrasoMedio: -5,
            quantidadeTitulos: 2,
            quantidadeBaixas: 2,
          },
        ],
        evolucaoMensal: [],
        tiposConsiderados: [],
        tiposConsideradosPagar: [],
        agingReceber: mockAging,
        agingPagar: mockAging,
      },
      loading: false,
      error: null,
      filtros: {},
      setFiltros: vi.fn(),
      recarregar: vi.fn(),
    });

    render(<PrazoMedioComponent />);
    expect(screen.getByText("Cliente Alfa")).toBeInTheDocument();

    const btnFornecedor = screen.getByText(/PMP por Fornecedor/);
    fireEvent.click(btnFornecedor);
    expect(screen.getByText("Fornecedor Beta")).toBeInTheDocument();
    expect(screen.getByText("45,0 dias")).toBeInTheDocument();
  });
});

describe("PrazoTabelaFornecedores", () => {
  it("renderiza fornecedores com volume e PMP concedido", () => {
    const fornecedores = [
      {
        fornecedorCodigo: "F01",
        fornecedorLoja: "01",
        nome: "Fornecedor Beta",
        valorTotal: 40000,
        pmpConcedido: 45,
        pmpRealizado: 40,
        atrasoMedio: -5,
        quantidadeTitulos: 2,
        quantidadeBaixas: 2,
      },
    ];
    render(<PrazoTabelaFornecedores fornecedores={fornecedores} />);
    expect(screen.getByText("Fornecedor Beta")).toBeInTheDocument();
    expect(screen.getByText("45,0 dias")).toBeInTheDocument();
    expect(screen.getByText("40,0 dias")).toBeInTheDocument();
    expect(screen.getByText("5,0 d antecipado")).toBeInTheDocument();
  });

  it("renderiza mensagem quando lista de fornecedores vazia", () => {
    render(<PrazoTabelaFornecedores fornecedores={[]} />);
    expect(screen.getByText(/Nenhum título a pagar encontrado/)).toBeInTheDocument();
  });
});

describe("PrazoFaixasVencimento", () => {
  it("renderiza faixas de aging a receber e a pagar", () => {
    render(<PrazoFaixasVencimento agingReceber={mockAging} agingPagar={mockAging} />);
    expect(screen.getByText("Aging Contas a Receber")).toBeInTheDocument();
    expect(screen.getByText("Aging Contas a Pagar")).toBeInTheDocument();
    expect(screen.getAllByText(/^Vencido \(/)).toHaveLength(2);
    expect(screen.getAllByText(/0 a 30 dias/)).toHaveLength(2);
  });
});
