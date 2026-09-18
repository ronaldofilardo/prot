import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseClienteExternalId,
  parseFaturamentoExternalId,
  parseContaReceberExternalId,
  parseBaixaExternalId,
  syncClientes,
  syncFaturamentos,
} from "../sync-engine";
import type { PrismaClient } from "@prisma/client";

describe("Sync Engine Parsers & Resolution (sync-engine.ts)", () => {
  it("extrai corretamente codigo e loja de externalId com hífens no empresaId", () => {
    const res1 = parseClienteExternalId("empresa-01-CLI-000001-01");
    expect(res1).toEqual({ codigo: "000001", loja: "01" });

    const res2 = parseClienteExternalId("tenant1-empresa2-CLI-CLI002-02");
    expect(res2).toEqual({ codigo: "CLI002", loja: "02" });
  });

  it("extrai corretamente filial e numeroNota do faturamento", () => {
    const res = parseFaturamentoExternalId("empresa-01-NF-01-NF100023");
    expect(res).toEqual({ filial: "01", numeroNota: "NF100023" });
  });

  it("extrai corretamente chaves de conta a receber", () => {
    const res = parseContaReceberExternalId("empresa-01-CR-01-FAT-000100-A");
    expect(res).toEqual({ filial: "01", prefixo: "FAT", numero: "000100", parcela: "A" });
  });

  it("extrai corretamente chaves de baixa", () => {
    const res = parseBaixaExternalId("empresa-01-BX-01-FAT-000100-A-20260917");
    expect(res).toEqual({ filial: "01", prefixo: "FAT", numero: "000100", parcela: "A" });
  });
});

describe("Sync Operations (syncClientes & syncFaturamentos)", () => {
  let mockTx: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx = {
      cliente: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      faturamento: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
  });

  it("sincroniza clientes criando novo registro quando não existente", async () => {
    const tx = mockTx as PrismaClient;
    vi.mocked(tx.cliente.findUnique).mockResolvedValue(null as never);

    const res = await syncClientes(tx, "empresa-01", [
      {
        externalId: "empresa-01-CLI-000001-01",
        company: "empresa-01",
        branch: "01",
        name: "Cliente Teste",
        city: "São Paulo",
        state: "SP",
        active: true,
        updatedAt: "2026-09-17T12:00:00.000Z",
      },
    ]);

    expect(res.criados).toBe(1);
    expect(tx.cliente.create).toHaveBeenCalledWith({
      data: {
        codigo: "000001",
        loja: "01",
        nome: "Cliente Teste",
        cidade: "São Paulo",
        estado: "SP",
        ativo: true,
        empresaId: "empresa-01",
      },
    });
  });

  it("sincroniza faturamento relacionando com cliente resolvido via externalId", async () => {
    const tx = mockTx as PrismaClient;
    vi.mocked(tx.faturamento.findUnique).mockResolvedValue(null as never);
    vi.mocked(tx.cliente.findUnique).mockResolvedValue({ id: "cli-123" } as never);

    const res = await syncFaturamentos(tx, "empresa-01", [
      {
        externalId: "empresa-01-NF-01-000100",
        company: "empresa-01",
        branch: "01",
        documentNumber: "000100",
        partyExternalId: "empresa-01-CLI-000001-01",
        issueDate: "2026-09-17T00:00:00.000Z",
        amount: 1500,
        currency: "BRL",
        updatedAt: "2026-09-17T12:00:00.000Z",
      },
    ]);

    expect(tx.cliente.findUnique).toHaveBeenCalledWith({
      where: {
        codigo_loja_empresaId: {
          codigo: "000001",
          loja: "01",
          empresaId: "empresa-01",
        },
      },
    });
    expect(res.criados).toBe(1);
    expect(tx.faturamento.create).toHaveBeenCalledWith({
      data: {
        filial: "01",
        numeroNota: "000100",
        dataEmissao: new Date("2026-09-17T00:00:00.000Z"),
        valorTotal: 1500,
        clienteId: "cli-123",
        empresaId: "empresa-01",
      },
    });
  });
});
