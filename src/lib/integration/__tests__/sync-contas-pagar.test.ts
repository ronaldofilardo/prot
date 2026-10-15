import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncContasPagar } from "../_internals/sync-contas-pagar";
import type { CanonicalPayable } from "../canonical";
import type { PrismaClient } from "@prisma/client";

function payable(overrides: Partial<CanonicalPayable> = {}): CanonicalPayable {
  return {
    externalId: "emp-01-CP-01-NF-000100-1-NF-FORN01-01",
    company: "emp-01",
    branch: "01",
    prefix: "NF",
    number: "000100",
    installment: "1",
    type: "NF",
    supplierCode: "FORN01",
    supplierStore: "01",
    supplierName: "Fornecedor Alfa",
    issueDate: "2026-04-01T00:00:00.000Z",
    dueDate: "2026-05-01T00:00:00.000Z",
    amount: 1500,
    currency: "BRL",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function novoTx() {
  return {
    contaPagar: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("syncContasPagar", () => {
  let tx: ReturnType<typeof novoTx>;
  let prisma: PrismaClient;

  beforeEach(() => {
    tx = novoTx();
    prisma = tx as unknown as PrismaClient;
  });

  it("insere novo registro quando não existe", async () => {
    tx.contaPagar.findUnique.mockResolvedValue(null);

    const res = await syncContasPagar(prisma, "emp-01", [payable()]);

    expect(res).toMatchObject({ entidade: "ContaPagar", processados: 1, criados: 1, atualizados: 0, erros: 0 });
    expect(tx.contaPagar.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        filial: "01",
        prefixo: "NF",
        numero: "000100",
        parcela: "1",
        tipo: "NF",
        fornecedorCodigo: "FORN01",
        fornecedorLoja: "01",
        fornecedorNome: "Fornecedor Alfa",
        valor: 1500,
        empresaId: "emp-01",
      }),
    });
  });

  it("atualiza registro quando já existe (idempotência)", async () => {
    tx.contaPagar.findUnique.mockResolvedValue({ id: "cp-1" });

    const res = await syncContasPagar(prisma, "emp-01", [payable({ amount: 2000 })]);

    expect(res).toMatchObject({ entidade: "ContaPagar", processados: 1, criados: 0, atualizados: 1, erros: 0 });
    expect(tx.contaPagar.update).toHaveBeenCalledWith({
      where: { id: "cp-1" },
      data: expect.objectContaining({
        valor: 2000,
      }),
    });
  });

  it("captura erro de banco sem abortar lote", async () => {
    tx.contaPagar.findUnique.mockRejectedValue(new Error("db down"));

    const res = await syncContasPagar(prisma, "emp-01", [payable()]);

    expect(res).toMatchObject({ entidade: "ContaPagar", processados: 1, criados: 0, atualizados: 0, erros: 1 });
  });

  it("retorna zeros para lote vazio", async () => {
    const res = await syncContasPagar(prisma, "emp-01", []);
    expect(res).toEqual({ entidade: "ContaPagar", processados: 0, criados: 0, atualizados: 0, erros: 0 });
  });
});
