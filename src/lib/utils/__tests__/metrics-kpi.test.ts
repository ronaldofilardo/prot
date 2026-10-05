import { describe, it, expect } from "vitest";
import { calcularKPIs } from "../metrics-kpi";
import type { FaturamentoComCliente, ContaReceberComClienteEBaixas } from "@/lib/types/dashboard";
import { Decimal } from "@prisma/client/runtime/library";

describe("Cálculo de KPIs Financeiros (metrics-kpi)", () => {
  const faturamentosMock: FaturamentoComCliente[] = [
    {
      id: "fat-1",
      filial: "01",
      numeroNota: "000001",
      dataEmissao: new Date("2026-08-10"),
      valorTotal: new Decimal(1500.5),
      clienteId: "cli-1",
      empresaId: "emp-1",
      sincronizadoEm: new Date(),
      cliente: { id: "cli-1", nome: "Cliente Alpha", codigo: "CLI001", estado: "SP" },
    },
    {
      id: "fat-2",
      filial: "01",
      numeroNota: "000002",
      dataEmissao: new Date("2026-08-15"),
      valorTotal: new Decimal(2500.5),
      clienteId: "cli-2",
      empresaId: "emp-1",
      sincronizadoEm: new Date(),
      cliente: { id: "cli-2", nome: "Cliente Beta", codigo: "CLI002", estado: "RJ" },
    },
  ];

  const contasReceberMock: ContaReceberComClienteEBaixas[] = [
    {
      id: "cr-1",
      filial: "01",
      prefixo: "FAT",
      numero: "000001",
      parcela: "A",
      tipo: "NF",
      dataEmissao: new Date("2026-07-01"),
      vencimento: new Date("2026-08-01"),
      valor: new Decimal(1000),
      clienteId: "cli-1",
      empresaId: "emp-1",
      sincronizadoEm: new Date(),
      cliente: { id: "cli-1", nome: "Cliente Alpha", codigo: "CLI001" },
      baixas: [{ valorBaixa: new Decimal(400) }],
    },
    {
      id: "cr-2",
      filial: "01",
      prefixo: "FAT",
      numero: "000002",
      parcela: "A",
      tipo: "NF",
      dataEmissao: new Date("2026-08-01"),
      vencimento: new Date("2099-12-31"),
      valor: new Decimal(5000),
      clienteId: "cli-2",
      empresaId: "emp-1",
      sincronizadoEm: new Date(),
      cliente: { id: "cli-2", nome: "Cliente Beta", codigo: "CLI002" },
      baixas: [],
    },
  ];

  it("calcula corretamente o faturamento total e ticket médio", () => {
    const kpis = calcularKPIs(faturamentosMock, contasReceberMock);
    expect(kpis.faturamentoTotal).toBe(4001);
    expect(kpis.ticketMedio).toBe(2000.5);
  });

  it("calcula saldo vencido considerando baixas parciais", () => {
    const kpis = calcularKPIs(faturamentosMock, contasReceberMock);
    expect(kpis.valorVencido).toBe(600);
  });

  it("retorna zeros quando listas estiverem vazias", () => {
    const kpis = calcularKPIs([], []);
    expect(kpis.faturamentoTotal).toBe(0);
    expect(kpis.valorVencido).toBe(0);
    expect(kpis.ticketMedio).toBe(0);
  });
});
