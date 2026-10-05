import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardHeader } from "../DashboardHeader";
import { ActiveFiltersBadge } from "../ActiveFiltersBadge";
import { DashboardKpiCards, type DashboardData } from "../DashboardKpiCards";
import {
  NotaFiscalRow,
  TableSkeleton,
  type DashboardNotaFiscal,
} from "../NotaFiscalRow";
import { DashboardInvoicesTable } from "../DashboardInvoicesTable";
import { useFilters } from "@/hooks/useFilters";

const brl = (v: number) =>
  v
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/ /g, " ");

const nf: DashboardNotaFiscal = {
  id: "1",
  filial: "01",
  numeroNota: "12345",
  clienteNome: "ACME LTDA",
  clienteCodigo: "00123",
  dataEmissao: "2026-01-15",
  valorTotal: 1500.75,
};

const kpi: DashboardData = {
  totalClientes: 10,
  faturamentoTotal: 1234.5,
  valorVencido: 50,
  ticketMedio: 100,
};

const inicial = useFilters.getState();

describe("componentes de cabecalho e KPIs do dashboard", () => {
  beforeEach(() => {
    useFilters.setState(inicial, true);
  });

  it("DashboardHeader exibe titulo e status de conexao", () => {
    render(<DashboardHeader />);

    expect(
      screen.getByRole("heading", { name: "Dashboard Financeiro Protheus" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Protheus Mock Conectado")).toBeInTheDocument();
  });

  it("ActiveFiltersBadge exibe os tres chips quando preenchidos", () => {
    render(
      <ActiveFiltersBadge
        cliente="ACME"
        dataInicial="2026-01-01"
        dataFinal="2026-01-31"
      />,
    );

    expect(screen.getByText("Cliente: ACME")).toBeInTheDocument();
    expect(screen.getByText("De: 2026-01-01")).toBeInTheDocument();
    expect(screen.getByText("Até: 2026-01-31")).toBeInTheDocument();
  });

  it("ActiveFiltersBadge omite chips vazios", () => {
    render(<ActiveFiltersBadge cliente="" dataInicial="" dataFinal="" />);

    expect(screen.getByText("Filtros aplicados:")).toBeInTheDocument();
    expect(screen.queryByText(/Cliente:/)).toBeNull();
    expect(screen.queryByText(/De:/)).toBeNull();
    expect(screen.queryByText(/Até:/)).toBeNull();
  });

  it("KPIs com dados formatam as moedas em real", () => {
    render(<DashboardKpiCards data={kpi} loading={false} />);

    expect(screen.getByText(brl(1234.5))).toBeInTheDocument();
    expect(screen.getByText(brl(50))).toBeInTheDocument();
    expect(screen.getByText(brl(100))).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("KPIs em loading exibem pulsos no lugar dos valores", () => {
    const { container } = render(<DashboardKpiCards data={kpi} loading />);

    expect(screen.queryByText(brl(1234.5))).toBeNull();
    expect(container.querySelectorAll(".animate-pulse").length).toBe(4);
  });

  it("KPIs toleram valores ausentes com fallbacks", () => {
    const parcial = {
      totalClientes: undefined,
      faturamentoTotal: 0,
      valorVencido: undefined,
      ticketMedio: NaN,
    } as unknown as DashboardData;
    render(<DashboardKpiCards data={parcial} loading={false} />);

    expect(screen.getAllByText("R$ 0,00")).toHaveLength(3);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("NotaFiscalRow renderiza todas as celulas formatadas", () => {
    render(
      <table>
        <tbody>
          <NotaFiscalRow nf={nf} />
        </tbody>
      </table>,
    );

    const data = new Date("2026-01-15").toLocaleDateString("pt-BR", {
      timeZone: "UTC",
    });
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.getByText("ACME LTDA")).toBeInTheDocument();
    expect(screen.getByText(/C.d: 00123/)).toBeInTheDocument();
    expect(screen.getByText(data)).toBeInTheDocument();
    expect(screen.getByText(brl(1500.75))).toBeInTheDocument();
    expect(screen.getByText("Faturado")).toBeInTheDocument();
  });

  it("NotaFiscalRow sem valor vira zero formatado", () => {
    render(
      <table>
        <tbody>
          <NotaFiscalRow
            nf={{ ...nf, valorTotal: undefined as unknown as number }}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
  });

  it("TableSkeleton renderiza cinco linhas de carregamento", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableSkeleton />
        </tbody>
      </table>,
    );

    expect(container.querySelectorAll("tr")).toHaveLength(5);
  });

  it("tabela de notas lista os registros e aciona o refresh", () => {
    const onRefresh = vi.fn();
    render(
      <DashboardInvoicesTable
        faturamentos={[nf]}
        loading={false}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByText("1 nota(s) exibida(s)")).toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Recarregar notas fiscais"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("tabela sem notas e sem refresh nao mostra o botao", () => {
    render(<DashboardInvoicesTable faturamentos={[]} loading />);

    expect(screen.getByText("0 nota(s) exibida(s)")).toBeInTheDocument();
    expect(screen.queryByTitle("Recarregar notas fiscais")).toBeNull();
  });

  it("tabela em loading desabilita o refresh", () => {
    render(
      <DashboardInvoicesTable
        faturamentos={[nf]}
        loading
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByTitle("Recarregar notas fiscais")).toBeDisabled();
  });
});
