import { describe, it, expect } from "vitest";
import { filtrarFaturamentos, filtrarContasReceber } from "../metrics-filter";
import type { Faturamento, ContaReceber } from "@/lib/types/dashboard";

describe("Filtragem de Métricas (metrics-filter)", () => {
  const faturamentosMock: Faturamento[] = [
    {
      id: "fat-1",
      filial: "01",
      numeroNota: "000001",
      dataEmissao: "2026-05-10",
      valorTotal: 1000,
      clienteId: "cli-1",
      empresaId: "emp-1",
      cliente: { id: "cli-1", nome: "Acme Indústria", codigo: "ACME01", estado: "SP" },
    },
    {
      id: "fat-2",
      filial: "01",
      numeroNota: "000002",
      dataEmissao: "2026-07-20",
      valorTotal: 2000,
      clienteId: "cli-2",
      empresaId: "emp-1",
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
    const contasMock: ContaReceber[] = [
      {
        id: "cr-1",
        filial: "01",
        prefixo: "FAT",
        numero: "001",
        parcela: "A",
        tipo: "NF",
        dataEmissao: "2026-05-10",
        vencimento: "2026-06-10",
        valor: 500,
        clienteId: "cli-1",
        empresaId: "emp-1",
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
        dataEmissao: "2026-07-20",
        vencimento: "2026-08-20",
        valor: 1000,
        clienteId: "cli-2",
        empresaId: "emp-1",
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
