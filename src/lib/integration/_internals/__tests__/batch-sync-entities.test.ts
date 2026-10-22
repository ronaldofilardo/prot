import { describe, it, expect, vi } from "vitest";
import { syncClientes } from "../sync-clientes";
import { syncFaturamentos } from "../sync-faturamento";
import type { PrismaClient } from "@prisma/client";
import type { CanonicalParty, CanonicalInvoice } from "../../canonical";

describe("Batch Sync Entities", () => {
  it("processa lote maior que o chunk e suporta repetição idempotente", async () => {
    const clientesDB: Array<{ id: string; codigo: string; loja: string; nome: string; cidade: string; estado: string; ativo: boolean }> = [];
    const mockTx = {
      cliente: {
        findMany: vi.fn().mockImplementation(() => Promise.resolve([...clientesDB])),
        createMany: vi.fn().mockImplementation(({ data }: { data: typeof clientesDB }) => {
          data.forEach((d, i) => clientesDB.push({ ...d, id: `c-${i}` }));
          return Promise.resolve({ count: data.length });
        }),
        update: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    } as unknown as PrismaClient;

    const registros: CanonicalParty[] = Array.from({ length: 600 }, (_, i) => ({
      externalId: `emp-01-CLI-${String(i).padStart(6, "0")}-01`,
      company: "emp-01",
      branch: "01",
      name: `Cliente ${i}`,
      city: "Cidade",
      state: "SP",
      active: true,
      updatedAt: "2026-01-01T00:00:00Z",
    }));

    // 1ª execução: cria todos os registros
    const res1 = await syncClientes(mockTx, "emp-01", registros);
    expect(res1.criados).toBe(600);
    expect(res1.atualizados).toBe(0);

    // 2ª execução com os mesmos dados: idempotente (0 criados, 0 atualizados)
    const res2 = await syncClientes(mockTx, "emp-01", registros);
    expect(res2.criados).toBe(0);
    expect(res2.atualizados).toBe(0);
  });

  it("faturamento ignora registro e soma erro quando cliente está ausente", async () => {
    const mockTx = {
      cliente: { findMany: vi.fn().mockResolvedValue([]) },
      faturamento: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    } as unknown as PrismaClient;

    const faturas: CanonicalInvoice[] = [{
      externalId: "emp-01-FAT-01-0001",
      company: "emp-01",
      branch: "01",
      documentNumber: "0001",
      partyExternalId: "emp-01-CLI-999999-01",
      issueDate: "2026-01-01T00:00:00Z",
      amount: 1500,
      currency: "BRL",
      updatedAt: "2026-01-01T00:00:00Z",
    }];

    const res = await syncFaturamentos(mockTx, "emp-01", faturas);
    expect(res.erros).toBe(1);
    expect(res.criados).toBe(0);
  });
});
