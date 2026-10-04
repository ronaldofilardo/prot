import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { POST } from "../route";

const { getServerSessionMock, pullAndSyncMock, logApiErrorMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  pullAndSyncMock: vi.fn(),
  logApiErrorMock: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/integration/pull-and-sync", () => ({ pullAndSyncFromProtheus: pullAndSyncMock }));
vi.mock("@/lib/utils/logger", () => ({ logApiError: logApiErrorMock }));

function sessaoCom(empresaId?: string): Session {
  return { user: { empresaId }, expires: "" } as unknown as Session;
}

const RESULTADO_OK = {
  entidade: "Cliente",
  registros: 3,
  sync: { entidade: "Cliente", processados: 3, criados: 1, atualizados: 2, erros: 0 },
};

describe("API /api/protheus/pull POST (route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue(sessaoCom("emp-01"));
    pullAndSyncMock.mockResolvedValue([RESULTADO_OK]);
  });

  it("retorna 401 quando não autenticado", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Nao autenticado" });
    expect(pullAndSyncMock).not.toHaveBeenCalled();
  });

  it("delega para pullAndSyncFromProtheus com o empresaId da sessão e devolve success=true", async () => {
    const res = await POST();
    const json = await res.json();

    expect(pullAndSyncMock).toHaveBeenCalledWith("emp-01");
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.resultados).toEqual([RESULTADO_OK]);
  });

  it("devolve success=false quando algum resultado carrega erro", async () => {
    pullAndSyncMock.mockResolvedValue([
      RESULTADO_OK,
      {
        entidade: "Faturamento",
        registros: 0,
        sync: { entidade: "Faturamento", processados: 0, criados: 0, atualizados: 0, erros: 1 },
        erro: "Protheus indisponível",
      },
    ]);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(false);
    expect(json.resultados).toHaveLength(2);
  });

  it("retorna 500 e registra logApiError quando o pull falha", async () => {
    pullAndSyncMock.mockRejectedValue(new Error("timeout"));

    const res = await POST();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Erro interno ao atualizar do Protheus" });
    expect(logApiErrorMock).toHaveBeenCalledWith(
      "Erro no endpoint de atualizacao manual do Protheus",
      expect.any(Error)
    );
  });
});
