import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { syncBaixasPagar } from "../_internals/sync-baixas-pagar";
import type { CanonicalPayment } from "../canonical";

function pagamentoPagar(overrides: Partial<CanonicalPayment> = {}): CanonicalPayment {
  return {
    externalId: "empresa-01-BXP-01-UNI-000100-1-NF-FORN01-01-20240115-01",
    company: "empresa-01",
    branch: "01",
    paymentBranch: "01",
    prefix: "UNI",
    number: "000100",
    installment: "1",
    type: "NF",
    amount: 1500,
    sequence: "01",
    paymentDate: "2024-01-15T00:00:00.000Z",
    titleExternalId: "empresa-01-CP-01-UNI-000100-1-NF-FORN01-01",
    supplierCode: "FORN01",
    supplierStore: "01",
    updatedAt: "2024-01-15T00:00:00.000Z",
    ...overrides,
  };
}

function novoTx() {
  return {
    contaPagar: { findUnique: vi.fn() },
    baixaPagar: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  };
}

describe("syncBaixasPagar", () => {
  let tx: ReturnType<typeof novoTx>;
  let prisma: PrismaClient;

  beforeEach(() => {
    tx = novoTx();
    prisma = tx as unknown as PrismaClient;
  });

  it("cria a baixa a pagar quando a conta existe e nao ha registro anterior", async () => {
    tx.contaPagar.findUnique.mockResolvedValue({ id: "cp-1" });
    tx.baixaPagar.findUnique.mockResolvedValue(null);

    const res = await syncBaixasPagar(prisma, "empresa-01", [pagamentoPagar()]);

    expect(res).toMatchObject({ entidade: "BaixaPagar", processados: 1, criados: 1, erros: 0 });
    expect(tx.baixaPagar.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contaPagarId: "cp-1",
        empresaId: "empresa-01",
        prefixo: "UNI",
        numero: "000100",
        parcela: "1",
        tipo: "NF",
        sequencia: "01",
        valorBaixa: 1500,
        dataBaixa: new Date("2024-01-15T00:00:00.000Z"),
      }),
    });
  });

  it("ignora registro duplicado quando sequencia ja existe para a mesma data e conta", async () => {
    tx.contaPagar.findUnique.mockResolvedValue({ id: "cp-1" });
    tx.baixaPagar.findUnique.mockResolvedValue({ id: "bxp-existente" });

    const res = await syncBaixasPagar(prisma, "empresa-01", [pagamentoPagar()]);

    expect(res).toMatchObject({ entidade: "BaixaPagar", processados: 1, criados: 0, erros: 0 });
    expect(tx.baixaPagar.create).not.toHaveBeenCalled();
  });

  it("incrementa erros e pula quando conta a pagar nao e encontrada", async () => {
    tx.contaPagar.findUnique.mockResolvedValue(null);

    const res = await syncBaixasPagar(prisma, "empresa-01", [pagamentoPagar()]);

    expect(res).toMatchObject({ entidade: "BaixaPagar", processados: 1, criados: 0, erros: 1 });
    expect(tx.baixaPagar.create).not.toHaveBeenCalled();
  });
});
