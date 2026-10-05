import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncContasReceber } from "../_internals/sync-contas-receber";
import type { CanonicalTitle } from "../canonical";
import type { PrismaClient } from "@prisma/client";

function titulo(overrides: Partial<CanonicalTitle> = {}): CanonicalTitle {
  return {
    externalId: "empresa-01-CR-01-FAT-000100-A",
    company: "empresa-01",
    branch: "01",
    prefix: "FAT",
    number: "000100",
    installment: "A",
    type: "NF",
    partyExternalId: "empresa-01-CLI-000001-01",
    issueDate: "2026-09-01T00:00:00.000Z",
    dueDate: "2026-10-01T00:00:00.000Z",
    amount: 100,
    currency: "BRL",
    status: "open",
    updatedAt: "2026-09-17T12:00:00.000Z",
    ...overrides,
  };
}

function novoTx() {
  return {
    contaReceber: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    cliente: { findUnique: vi.fn() },
  };
}

describe("syncContasReceber", () => {
  let tx: ReturnType<typeof novoTx>;
  let prisma: PrismaClient;

  beforeEach(() => {
    tx = novoTx();
    prisma = tx as unknown as PrismaClient;
  });

  it("insere quando a conta ainda nao existe e ha cliente", async () => {
    tx.contaReceber.findUnique.mockResolvedValue(null);
    tx.cliente.findUnique.mockResolvedValue({ id: "cli-1" });

    const res = await syncContasReceber(prisma, "empresa-01", [titulo()]);

    expect(res).toMatchObject({ entidade: "ContaReceber", processados: 1, criados: 1, atualizados: 0, erros: 0 });
    expect(tx.contaReceber.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ filial: "01", prefixo: "FAT", numero: "000100", parcela: "A", clienteId: "cli-1" }),
    });
  });

  it("atualiza valor e vencimento quando a conta ja existe", async () => {
    tx.contaReceber.findUnique.mockResolvedValue({ id: "cb-1" });

    const res = await syncContasReceber(prisma, "empresa-01", [titulo({ amount: 250 })]);

    expect(res).toMatchObject({ criados: 0, atualizados: 1, erros: 0 });
    expect(tx.contaReceber.update).toHaveBeenCalledWith({
      where: { id: "cb-1" },
      data: { valor: 250, vencimento: new Date("2026-10-01T00:00:00.000Z") },
    });
  });

  it("pula com erro quando o cliente nao e encontrado", async () => {
    tx.contaReceber.findUnique.mockResolvedValue(null);
    tx.cliente.findUnique.mockResolvedValue(null);

    const res = await syncContasReceber(prisma, "empresa-01", [titulo()]);

    expect(res).toMatchObject({ criados: 0, atualizados: 0, erros: 1 });
    expect(tx.contaReceber.create).not.toHaveBeenCalled();
  });

  it("falha de banco no upsert vira erro sem abortar o lote", async () => {
    tx.contaReceber.findUnique.mockRejectedValueOnce(new Error("db down"));

    const res = await syncContasReceber(prisma, "empresa-01", [titulo()]);

    expect(res).toMatchObject({ processados: 1, criados: 0, atualizados: 0, erros: 1 });
  });

  it("lote vazio retorna tudo zerado", async () => {
    const res = await syncContasReceber(prisma, "empresa-01", []);

    expect(res).toEqual({ entidade: "ContaReceber", processados: 0, criados: 0, atualizados: 0, erros: 0 });
    expect(tx.contaReceber.findUnique).not.toHaveBeenCalled();
  });
});
