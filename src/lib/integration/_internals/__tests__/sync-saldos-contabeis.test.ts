import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncSaldosContabeis } from "../sync-saldos-contabeis";
import { parseSaldoContabilExternalId } from "../sync-parsers";

const mockPrisma = {
  saldoContabil: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("../logger", () => ({
  logSyncStart: vi.fn(),
  logSyncSuccess: vi.fn(),
  logSyncError: vi.fn(),
}));

describe("syncSaldosContabeis (sync-saldos-contabeis.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("insere novo saldo contabil quando não existe", async () => {
    mockPrisma.saldoContabil.findUnique.mockResolvedValue(null);
    mockPrisma.saldoContabil.create.mockResolvedValue({});

    const registros = [
      {
        externalId: "emp-01-SC-01-1000-2024-01",
        company: "emp-01",
        branch: "01",
        account: "1000",
        period: "2024-01",
        fiscalYear: "2024",
        previousBalance: 1000,
        debits: 500,
        credits: 200,
        currentBalance: 700,
        updatedAt: "2024-01-31T00:00:00.000Z",
      },
    ];

    const result = await syncSaldosContabeis(mockPrisma as any, "emp-01", registros);

    expect(result).toEqual({
      entidade: "SaldoContabil",
      processados: 1,
      criados: 1,
      atualizados: 0,
      erros: 0,
    });
    expect(mockPrisma.saldoContabil.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.saldoContabil.update).not.toHaveBeenCalled();
  });

  it("atualiza saldo contabil existente", async () => {
    mockPrisma.saldoContabil.findUnique.mockResolvedValue({ id: "saldo-1" });
    mockPrisma.saldoContabil.update.mockResolvedValue({});

    const registros = [
      {
        externalId: "emp-01-SC-01-1000-2024-01",
        company: "emp-01",
        branch: "01",
        account: "1000",
        period: "2024-01",
        fiscalYear: "2024",
        previousBalance: 1000,
        debits: 500,
        credits: 200,
        currentBalance: 700,
        updatedAt: "2024-01-31T00:00:00.000Z",
      },
    ];

    const result = await syncSaldosContabeis(mockPrisma as any, "emp-01", registros);

    expect(result).toEqual({
      entidade: "SaldoContabil",
      processados: 1,
      criados: 0,
      atualizados: 1,
      erros: 0,
    });
    expect(mockPrisma.saldoContabil.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.saldoContabil.create).not.toHaveBeenCalled();
  });

  it("processa múltiplos registros mistos (insere e atualiza)", async () => {
    mockPrisma.saldoContabil.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "saldo-2" });
    mockPrisma.saldoContabil.create.mockResolvedValue({});
    mockPrisma.saldoContabil.update.mockResolvedValue({});

    const registros = [
      {
        externalId: "emp-01-SC-01-1000-2024-01",
        company: "emp-01",
        branch: "01",
        account: "1000",
        period: "2024-01",
        fiscalYear: "2024",
        previousBalance: 1000,
        debits: 500,
        credits: 200,
        currentBalance: 700,
        updatedAt: "2024-01-31T00:00:00.000Z",
      },
      {
        externalId: "emp-01-SC-01-2000-2024-01",
        company: "emp-01",
        branch: "01",
        account: "2000",
        period: "2024-01",
        fiscalYear: "2024",
        previousBalance: 2000,
        debits: 300,
        credits: 100,
        currentBalance: 1800,
        updatedAt: "2024-01-31T00:00:00.000Z",
      },
    ];

    const result = await syncSaldosContabeis(mockPrisma as any, "emp-01", registros);

    expect(result).toEqual({
      entidade: "SaldoContabil",
      processados: 2,
      criados: 1,
      atualizados: 1,
      erros: 0,
    });
  });

  it("conta erros quando create falha", async () => {
    mockPrisma.saldoContabil.findUnique.mockResolvedValue(null);
    mockPrisma.saldoContabil.create.mockRejectedValue(new Error("db error"));

    const registros = [
      {
        externalId: "emp-01-SC-01-1000-2024-01",
        company: "emp-01",
        branch: "01",
        account: "1000",
        period: "2024-01",
        fiscalYear: "2024",
        previousBalance: 1000,
        debits: 500,
        credits: 200,
        currentBalance: 700,
        updatedAt: "2024-01-31T00:00:00.000Z",
      },
    ];

    const result = await syncSaldosContabeis(mockPrisma as any, "emp-01", registros);

    expect(result.erros).toBe(1);
    expect(result.criados).toBe(0);
    expect(result.atualizados).toBe(0);
  });

  it("conta erros quando update falha", async () => {
    mockPrisma.saldoContabil.findUnique.mockResolvedValue({ id: "saldo-1" });
    mockPrisma.saldoContabil.update.mockRejectedValue(new Error("db error"));

    const registros = [
      {
        externalId: "emp-01-SC-01-1000-2024-01",
        company: "emp-01",
        branch: "01",
        account: "1000",
        period: "2024-01",
        fiscalYear: "2024",
        previousBalance: 1000,
        debits: 500,
        credits: 200,
        currentBalance: 700,
        updatedAt: "2024-01-31T00:00:00.000Z",
      },
    ];

    const result = await syncSaldosContabeis(mockPrisma as any, "emp-01", registros);

    expect(result.erros).toBe(1);
    expect(result.criados).toBe(0);
    expect(result.atualizados).toBe(0);
  });

  it("continua processando após erro em um registro", async () => {
    mockPrisma.saldoContabil.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "saldo-2" });
    mockPrisma.saldoContabil.create.mockRejectedValueOnce(new Error("db error"));
    mockPrisma.saldoContabil.update.mockResolvedValueOnce({});

    const registros = [
      {
        externalId: "emp-01-SC-01-1000-2024-01",
        company: "emp-01",
        branch: "01",
        account: "1000",
        period: "2024-01",
        fiscalYear: "2024",
        previousBalance: 1000,
        debits: 500,
        credits: 200,
        currentBalance: 700,
        updatedAt: "2024-01-31T00:00:00.000Z",
      },
      {
        externalId: "emp-01-SC-01-2000-2024-01",
        company: "emp-01",
        branch: "01",
        account: "2000",
        period: "2024-01",
        fiscalYear: "2024",
        previousBalance: 2000,
        debits: 300,
        credits: 100,
        currentBalance: 1800,
        updatedAt: "2024-01-31T00:00:00.000Z",
      },
    ];

    const result = await syncSaldosContabeis(mockPrisma as any, "emp-01", registros);

    expect(result).toEqual({
      entidade: "SaldoContabil",
      processados: 2,
      criados: 0,
      atualizados: 1,
      erros: 1,
    });
  });

  it("retorna zeros para array vazio", async () => {
    const result = await syncSaldosContabeis(mockPrisma as any, "emp-01", []);

    expect(result).toEqual({
      entidade: "SaldoContabil",
      processados: 0,
      criados: 0,
      atualizados: 0,
      erros: 0,
    });
  });
});

describe("parseSaldoContabilExternalId (sync-parsers.ts)", () => {
  it("parseia externalId com padrão -SC-", () => {
    const result = parseSaldoContabilExternalId("emp-01-SC-01-1000-2024-01");
    expect(result).toEqual({ filial: "01", conta: "1000", competencia: "2024-01" });
  });

  it("parseia externalId com conta contendo hífens", () => {
    const result = parseSaldoContabilExternalId("emp-01-SC-01-1.1.001-2024-01");
    expect(result).toEqual({ filial: "01", conta: "1.1.001", competencia: "2024-01" });
  });

  it("parseia externalId sem padrão -SC- (fallback)", () => {
    const result = parseSaldoContabilExternalId("emp-01-01-1000-2024-01");
    expect(result).toEqual({ filial: "emp", conta: "01", competencia: "01-1000" });
  });

  it("parseia externalId com partes faltando (fallback)", () => {
    const result = parseSaldoContabilExternalId("emp-01");
    expect(result).toEqual({ filial: "emp", conta: "01", competencia: "0000-00" });
  });

  it("parseia externalId apenas com filial (fallback)", () => {
    const result = parseSaldoContabilExternalId("emp-01-01");
    expect(result).toEqual({ filial: "emp", conta: "01", competencia: "01-00" });
  });
});