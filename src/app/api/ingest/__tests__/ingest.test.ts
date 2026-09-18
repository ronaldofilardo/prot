import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const { mockTransaction, mockSyncLogCreate, mockSyncClientes } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockSyncLogCreate: vi.fn(),
  mockSyncClientes: vi.fn(),
}));

vi.mock("@/lib/db/prisma-client", () => ({
  prisma: {
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/integration/sync-engine", () => ({
  syncClientes: mockSyncClientes,
  syncFaturamentos: vi.fn(),
  syncContasReceber: vi.fn(),
  syncBaixas: vi.fn(),
  parseClienteExternalId: vi.fn(),
  parseFaturamentoExternalId: vi.fn(),
  parseContaReceberExternalId: vi.fn(),
  parseBaixaExternalId: vi.fn(),
}));

describe("API /api/ingest Security & Transaction (route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncClientes.mockResolvedValue({
      entidade: "Cliente",
      processados: 1,
      criados: 1,
      atualizados: 0,
      erros: 0,
    });
  });

  it("retorna 401 caso o header X-API-Key esteja ausente ou incorreto", async () => {
    const requestNoKey = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      body: JSON.stringify({ empresaId: "emp-1", entidade: "Cliente", registros: [] }),
    });

    const responseNoKey = await POST(requestNoKey);
    expect(responseNoKey.status).toBe(401);
    const dataNoKey = await responseNoKey.json();
    expect(dataNoKey.error).toContain("API Key invalida ou ausente");

    const requestBadKey = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "x-api-key": "chave-errada" },
      body: JSON.stringify({ empresaId: "emp-1", entidade: "Cliente", registros: [] }),
    });

    const responseBadKey = await POST(requestBadKey);
    expect(responseBadKey.status).toBe(401);
  });

  it("executa a ingestão dentro de prisma.$transaction se X-API-Key for válida", async () => {
    const validKey = process.env.INGEST_API_KEY || "ingest-secret-key-change-me";

    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        syncLog: { create: mockSyncLogCreate },
      };
      return callback(mockTx);
    });

    const request = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "x-api-key": validKey },
      body: JSON.stringify({
        empresaId: "empresa-01",
        entidade: "Cliente",
        registros: [
          {
            externalId: "empresa-01-CLI-000001-01",
            company: "empresa-01",
            branch: "01",
            name: "Cliente Teste",
            city: "SP",
            state: "SP",
            active: true,
            updatedAt: "2026-09-17T12:00:00.000Z",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.resultado.criados).toBe(1);
  });
});
