import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncBaixas } from "../_internals/sync-baixas";
import type { CanonicalPayment } from "../canonical";
import type { PrismaClient } from "@prisma/client";

function pagamento(): CanonicalPayment {
  return {
    externalId: "empresa-01-BX-01-FAT-000100-A-20260917",
    company: "empresa-01",
    branch: "01",
    paymentBranch: "02",
    prefix: "FAT",
    number: "000100",
    installment: "A",
    type: "DIN",
    amount: 50,
    paymentDate: "2026-09-17T12:00:00.000Z",
    titleExternalId: "empresa-01-CR-01-FAT-000100-A",
    updatedAt: "2026-09-17T12:00:00.000Z",
  };
}

function novoTx() {
  return {
    contaReceber: { findUnique: vi.fn() },
    baixa: { findFirst: vi.fn(), create: vi.fn() },
  };
}

describe("syncBaixas", () => {
  let tx: ReturnType<typeof novoTx>;
  let prisma: PrismaClient;

  beforeEach(() => {
    tx = novoTx();
    prisma = tx as unknown as PrismaClient;
  });

  it("cria a baixa quando a conta existe e nao ha registro anterior", async () => {
    tx.contaReceber.findUnique.mockResolvedValue({ id: "cb-1" });
    tx.baixa.findFirst.mockResolvedValue(null);

    const res = await syncBaixas(prisma, "empresa-01", [pagamento()]);

    expect(res).toMatchObject({ entidade: "Baixa", processados: 1, criados: 1, atualizados: 0, erros: 0 });
    expect(tx.baixa.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contaReceberId: "cb-1",
        empresaId: "empresa-01",
        filialBaixa: "02",
        prefixo: "FAT",
        numero: "000100",
        parcela: "A",
        valorBaixa: 50,
        dataBaixa: new Date("2026-09-17T12:00:00.000Z"),
      }),
    });
  });

  it("ignora quando a baixa ja foi registrada", async () => {
    tx.contaReceber.findUnique.mockResolvedValue({ id: "cb-1" });
    tx.baixa.findFirst.mockResolvedValue({ id: "bx-1" });

    const res = await syncBaixas(prisma, "empresa-01", [pagamento()]);

    expect(res).toMatchObject({ criados: 0, erros: 0 });
    expect(tx.baixa.create).not.toHaveBeenCalled();
  });

  it("conta a receber inexistente vira erro de skip", async () => {
    tx.contaReceber.findUnique.mockResolvedValue(null);

    const res = await syncBaixas(prisma, "empresa-01", [pagamento()]);

    expect(res).toMatchObject({ criados: 0, erros: 1 });
    expect(tx.baixa.findFirst).not.toHaveBeenCalled();
  });

  it("falha de banco na baixa vira erro sem abortar o lote", async () => {
    tx.contaReceber.findUnique.mockRejectedValue(new Error("db down"));

    const res = await syncBaixas(prisma, "empresa-01", [pagamento()]);

    expect(res).toMatchObject({ processados: 1, criados: 0, erros: 1 });
  });

  it("lote vazio retorna tudo zerado", async () => {
    const res = await syncBaixas(prisma, "empresa-01", []);

    expect(res).toEqual({ entidade: "Baixa", processados: 0, criados: 0, atualizados: 0, erros: 0 });
    expect(tx.contaReceber.findUnique).not.toHaveBeenCalled();
  });
});
