import { describe, it, expect } from "vitest";
import { filtrarFaturamentos, filtrarContasReceber } from "../metrics-filter";
import type { FaturamentoComCliente, ContaReceberComClienteEBaixas } from "@/lib/types/dashboard";
import { Decimal } from "@prisma/client/runtime/library";
import type { Cliente } from "@prisma/client";

describe("Filtragem de Métricas (metrics-filter)", () => {
  const faturamentosMock: FaturamentoComCliente[] = [
    {
      id: "fat-1",
      filial: "01",
      numeroNota: "000001",
      dataEmissao: new Date("2026-05-10"),
      valorTotal: new Decimal(1000),
      clienteId: "cli-1",
      empresaId: "emp-1",
      sincronizadoEm: new Date(),
      cliente: { id: "cli-1", nome: "Acme Indústria", codigo: "ACME01", estado: "SP" },
    },
    {
      id: "fat-2",
      filial: "01",
      numeroNota: "000002",
      dataEmissao: new Date("2026-07-20"),
      valorTotal: new Decimal(2000),
      clienteId: "cli-2",
      empresaId: "emp-1",
      sincronizadoEm: new Date(),
      cliente: { id: "cli-2", nome: "Beta Logística", codigo: "BETA02", estado: "MG" },
    },
  ];

  it("filtra faturamentos por nome de cliente (case insensitive)", () => {
    const filtrados = filtrarFaturamentos(faturamentosMock, {
      cliente: "acme",
      dataInicial: "",
      dataFinal: "",
      matrizId: null,
      empresaIds: [],
    });
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].id).toBe("fat-1");
  });

  it("filtra faturamentos por intervalo de datas", () => {
    const filtrados = filtrarFaturamentos(faturamentosMock, {
      cliente: "",
      dataInicial: "2026-06-01",
      dataFinal: "2026-08-01",
      matrizId: null,
      empresaIds: [],
    });
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].id).toBe("fat-2");
  });

  it("retorna lista intacta quando nenhum filtro for informado", () => {
    const filtrados = filtrarFaturamentos(faturamentosMock, {
      cliente: "",
      dataInicial: "",
      dataFinal: "",
      matrizId: null,
      empresaIds: [],
    });
    expect(filtrados).toHaveLength(2);
  });

  it("filtra contas a receber por cliente", () => {
    const contasMock: ContaReceberComClienteEBaixas[] = [
      {
        id: "cr-1",
        filial: "01",
        prefixo: "FAT",
        numero: "001",
        parcela: "A",
        tipo: "NF",
        dataEmissao: new Date("2026-05-10"),
        vencimento: new Date("2026-06-10"),
        valor: new Decimal(500),
        clienteId: "cli-1",
        empresaId: "emp-1",
        sincronizadoEm: new Date(),
        cliente: { id: "cli-1", nome: "Acme Indústria", codigo: "ACME01" },
        baixas: [],
      },
      {
        id: "cr-2",
        filial: "01",
        prefixo: "FAT",
        numero: "002",
        parcela: "A",
        tipo: "NF",
        dataEmissao: new Date("2026-07-20"),
        vencimento: new Date("2026-08-20"),
        valor: new Decimal(1000),
        clienteId: "cli-2",
        empresaId: "emp-1",
        sincronizadoEm: new Date(),
        cliente: { id: "cli-2", nome: "Beta Logística", codigo: "BETA02" },
        baixas: [],
      },
    ];

    const filtrados = filtrarContasReceber(contasMock, {
      cliente: "beta",
      dataInicial: "",
      dataFinal: "",
      matrizId: null,
      empresaIds: [],
    });
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].id).toBe("cr-2");
  });
});
