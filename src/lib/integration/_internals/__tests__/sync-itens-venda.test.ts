import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { syncItensVenda } from "../sync-itens-venda";
import type { CanonicalSaleItem } from "../../canonical";

const mockPrisma = {
  itemVenda: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  cliente: {
    findUnique: vi.fn(),
  },
};

vi.mock("../logger", () => ({
  logSyncStart: vi.fn(),
  logSyncSuccess: vi.fn(),
  logSyncError: vi.fn(),
  logSyncSkip: vi.fn(),
}));

const itemValido: CanonicalSaleItem = {
  externalId: "emp-01-IT-01-000100-1-000001-01-01",
  company: "emp-01",
  branch: "01",
  documentNumber: "000100",
  series: "1",
  item: "01",
  productCode: "PROD1",
  partyExternalId: "emp-01-CLI-000001-01",
  issueDate: "2026-03-15T00:00:00.000Z",
  quantity: 10,
  totalAmount: 1000,
  costAmount: 600,
  cfop: "5102",
  tes: "501",
  type: "N",
  updatedAt: "2026-03-15T00:00:00.000Z",
};

describe("syncItensVenda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("insere novo item de venda quando cliente existe e registro não existe", async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: "cli-123" });
    mockPrisma.itemVenda.findUnique.mockResolvedValue(null);
    mockPrisma.itemVenda.create.mockResolvedValue({ id: "item-1" });

    const res = await syncItensVenda(mockPrisma as unknown as PrismaClient, "emp-01", [itemValido]);

    expect(res).toEqual({ entidade: "ItemVenda", processados: 1, criados: 1, atualizados: 0, erros: 0 });
    expect(mockPrisma.itemVenda.create).toHaveBeenCalledTimes(1);
  });

  it("atualiza item de venda quando já existe", async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: "cli-123" });
    mockPrisma.itemVenda.findUnique.mockResolvedValue({ id: "item-existente" });
    mockPrisma.itemVenda.update.mockResolvedValue({ id: "item-existente" });

    const res = await syncItensVenda(mockPrisma as unknown as PrismaClient, "emp-01", [itemValido]);

    expect(res).toEqual({ entidade: "ItemVenda", processados: 1, criados: 0, atualizados: 1, erros: 0 });
    expect(mockPrisma.itemVenda.update).toHaveBeenCalledTimes(1);
  });

  it("pula registro e contabiliza erro quando cliente não é encontrado", async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null);

    const res = await syncItensVenda(mockPrisma as unknown as PrismaClient, "emp-01", [itemValido]);

    expect(res).toEqual({ entidade: "ItemVenda", processados: 1, criados: 0, atualizados: 0, erros: 1 });
    expect(mockPrisma.itemVenda.create).not.toHaveBeenCalled();
    expect(mockPrisma.itemVenda.update).not.toHaveBeenCalled();
  });
});
