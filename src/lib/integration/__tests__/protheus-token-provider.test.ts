import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DatabaseProtheusTokenProvider,
  type ProtheusCredencialData,
  type ProtheusCredencialStore,
} from "../protheus-token-provider";
import { encryptText } from "@/lib/security/crypto-vault";

type CredencialStoreMock = ProtheusCredencialStore & {
  protheusCredencial: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("DatabaseProtheusTokenProvider", () => {
  const fakePasswordEnc = encryptText("LC1sysC0nt@l2026adml@");
  let mockCred: ProtheusCredencialData;
  let mockDb: CredencialStoreMock;

  beforeEach(() => {
    delete process.env.PROTHEUS_REST_TOKEN_PATH;
    mockCred = {
      empresaId: "empresa-123",
      baseUrl: "https://protheus.example.test:1656",
      clientId: "141404",
      username: "admin",
      passwordEnc: fakePasswordEnc,
      accessToken: "existing-valid-token",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // expira em 30 min
    };

    mockDb = {
      protheusCredencial: {
        findUnique: vi.fn().mockImplementation(() => Promise.resolve(mockCred)),
        update: vi.fn().mockImplementation(() => Promise.resolve(mockCred)),
      },
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("retorna o token em cache se ele for valido e tiver mais de 60s de validade", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = new DatabaseProtheusTokenProvider(mockDb);
    const token = await provider.getValidToken("empresa-123");

    expect(token).toBe("existing-valid-token");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockDb.protheusCredencial.update).not.toHaveBeenCalled();
  });

  it("faz POST para renovar o token quando ele estiver prestes a expirar (< 60s)", async () => {
    // Expira em 30 segundos (dentro da margem de 60s)
    mockCred.expiresAt = new Date(Date.now() + 30 * 1000);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "new-generated-token", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new DatabaseProtheusTokenProvider(mockDb);
    const token = await provider.getValidToken("empresa-123");

    expect(token).toBe("new-generated-token");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://protheus.example.test:1656/rest/api/oauth2/v1/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("141404:141404").toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      })
    );

    expect(mockDb.protheusCredencial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { empresaId: "empresa-123" },
        data: expect.objectContaining({ accessToken: "new-generated-token" }),
      })
    );
  });

  it("forca a renovacao do token se forceRefresh for true", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "forced-refresh-token", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new DatabaseProtheusTokenProvider(mockDb);
    const token = await provider.getValidToken("empresa-123", true);

    expect(token).toBe("forced-refresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("lanca erro amigavel ao receber 401 da TOTVS", async () => {
    mockCred.accessToken = null;
    mockCred.expiresAt = null;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }))
    );

    const provider = new DatabaseProtheusTokenProvider(mockDb);
    await expect(provider.getValidToken("empresa-123")).rejects.toThrow(
      "Credenciais Protheus invalidas ou nao autorizadas"
    );
  });

  it("lanca erro se a empresa nao tiver credenciais cadastradas", async () => {
    mockDb.protheusCredencial.findUnique.mockResolvedValue(null);

    const provider = new DatabaseProtheusTokenProvider(mockDb);
    await expect(provider.getValidToken("empresa-inexistente")).rejects.toThrow(
      "Credenciais Protheus nao configuradas para esta empresa"
    );
  });
});
