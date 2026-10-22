import { describe, it, expect, vi } from "vitest";
import { mergeAndDedupe } from "../rest-paginate";
import { syncFaturamentos } from "../sync-faturamento";
import { syncContasReceber } from "../sync-contas-receber";
import { syncBaixas } from "../sync-baixas";
import type { CanonicalInvoice, CanonicalPayment, CanonicalTitle } from "@/lib/integration/canonical";
import type { PrismaClient } from "@prisma/client";

describe("Fase 4 - Dedupe, Series, Tipos e Saldos", () => {
  it("deduplica em memória usando chaves contendo filial", () => {
    const listA = [
      { F2_FILIAL: "01", F2_DOC: "000100", F2_SERIE: "1", VAL: "10" },
      { F2_FILIAL: "02", F2_DOC: "000100", F2_SERIE: "1", VAL: "20" },
    ];
    const listB = [
      { F2_FILIAL: "01", F2_DOC: "000100", F2_SERIE: "1", VAL: "10-updated" },
      { F2_FILIAL: "01", F2_DOC: "000101", F2_SERIE: "1", VAL: "30" },
    ];
    const result = mergeAndDedupe([...listB, ...listA], ["F2_FILIAL", "F2_DOC", "F2_SERIE"]);

    expect(result).toHaveLength(3);
    const item01 = result.find((r) => r.F2_FILIAL === "01" && r.F2_DOC === "000100");
    expect(item01?.VAL).toBe("10-updated");
  });

  it("permite notas com mesmo numero e series diferentes", async () => {
    const mockTx = {
      faturamento: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      cliente: {
        findMany: vi.fn().mockResolvedValue([{ id: "c1", codigo: "0001", loja: "01" }]),
      },
    } as unknown as PrismaClient;

    const notas: CanonicalInvoice[] = [
      {
        externalId: "emp-NF-01-000100-1",
        company: "emp",
        branch: "01",
        documentNumber: "000100",
        series: "1",
        partyExternalId: "emp-CLI-0001-01",
        issueDate: "2026-01-01T00:00:00.000Z",
        amount: 500,
        currency: "BRL",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        externalId: "emp-NF-01-000100-2",
        company: "emp",
        branch: "01",
        documentNumber: "000100",
        series: "2",
        partyExternalId: "emp-CLI-0001-01",
        issueDate: "2026-01-01T00:00:00.000Z",
        amount: 600,
        currency: "BRL",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const res = await syncFaturamentos(mockTx, "emp", notas);
    expect(res.criados).toBe(2);
    expect(res.erros).toBe(0);
    expect(mockTx.faturamento.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ numeroNota: "000100", serie: "1", valorTotal: 500 }),
          expect.objectContaining({ numeroNota: "000100", serie: "2", valorTotal: 600 }),
        ]),
      })
    );
  });

  it("armazena saldo parcial e suporta mesmo numero com tipos diferentes", async () => {
    const mockTx = {
      contaReceber: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      cliente: {
        findMany: vi.fn().mockResolvedValue([{ id: "c1", codigo: "0001", loja: "01" }]),
      },
    } as unknown as PrismaClient;

    const titulos: CanonicalTitle[] = [
      {
        externalId: "emp-CR-01-FAT-000100-A-NF",
        company: "emp",
        branch: "01",
        prefix: "FAT",
        number: "000100",
        installment: "A",
        type: "NF",
        partyExternalId: "emp-CLI-0001-01",
        issueDate: "2026-01-01T00:00:00.000Z",
        dueDate: "2026-02-01T00:00:00.000Z",
        amount: 1000,
        balance: 400, // saldo parcial
        currency: "BRL",
        status: "open",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        externalId: "emp-CR-01-FAT-000100-A-IR",
        company: "emp",
        branch: "01",
        prefix: "FAT",
        number: "000100",
        installment: "A",
        type: "IR-",
        partyExternalId: "emp-CLI-0001-01",
        issueDate: "2026-01-01T00:00:00.000Z",
        dueDate: "2026-02-01T00:00:00.000Z",
        amount: 15,
        balance: 15,
        currency: "BRL",
        status: "open",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const res = await syncContasReceber(mockTx, "emp", titulos);
    expect(res.criados).toBe(2);
    expect(res.erros).toBe(0);
    expect(mockTx.contaReceber.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ numero: "000100", tipo: "NF", valor: 1000, saldo: 400 }),
          expect.objectContaining({ numero: "000100", tipo: "IR-", valor: 15, saldo: 15 }),
        ]),
      })
    );
  });

  it("vincula baixa ao titulo com compatibilidade para chave sem tipo", async () => {
    const mockTx = {
      baixa: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      contaReceber: {
        findMany: vi.fn().mockResolvedValue([
          { id: "cr-1", filial: "01", prefixo: "FAT", numero: "000100", parcela: "A", tipo: "NF" },
        ]),
      },
    } as unknown as PrismaClient;

    const baixas: CanonicalPayment[] = [
      {
        externalId: "emp-BX-01-FAT-000100-A-NF-20260215-01",
        company: "emp",
        branch: "01",
        paymentBranch: "01",
        prefix: "FAT",
        number: "000100",
        installment: "A",
        type: "NF",
        sequence: "01",
        amount: 600,
        paymentDate: "2026-02-15T00:00:00.000Z",
        titleExternalId: "emp-CR-01-FAT-000100-A-NF",
        updatedAt: "2026-02-15T00:00:00.000Z",
      },
    ];

    const res = await syncBaixas(mockTx, "emp", baixas);
    expect(res.criados).toBe(1);
    expect(res.erros).toBe(0);
    expect(mockTx.baixa.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            contaReceberId: "cr-1",
            sequencia: "01",
            valorBaixa: 600,
          }),
        ],
      })
    );
  });
});
