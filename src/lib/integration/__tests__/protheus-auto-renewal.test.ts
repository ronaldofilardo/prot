import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DatabaseProtheusTokenProvider } from "../protheus-token-provider";
import { clearMemoryToken, getMemoryToken } from "../_internals/token-env-sync";
import { buildAuthHeader } from "../_internals/rest-auth";

describe("Renovacao automatica de Token Protheus", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    clearMemoryToken();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...origEnv };
    clearMemoryToken();
  });

  it("renova automaticamente via refresh_token quando o token estiver expirado", async () => {
    process.env.PROTHEUS_REST_BASE_URL = "https://protheus.example.com";
    process.env.PROTHEUS_REST_ACCESS_TOKEN = "token-expirado";
    process.env.PROTHEUS_REST_REFRESH_TOKEN = "valid-refresh-token";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "novo-token-renovado-123",
          refresh_token: "proximo-refresh-token",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new DatabaseProtheusTokenProvider();
    const token = await provider.getValidToken("empresa-001", true);

    expect(token).toBe("novo-token-renovado-123");
    expect(getMemoryToken().accessToken).toBe("novo-token-renovado-123");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl, calledOpts] = fetchMock.mock.calls[0];
    expect(calledUrl).toContain("/api/oauth2/v1/token");
    expect(calledOpts.body).toContain("grant_type=refresh_token");
    expect(calledOpts.body).toContain("refresh_token=valid-refresh-token");
  });

  it("faz fallback para usuario e senha se o refresh_token falhar", async () => {
    process.env.PROTHEUS_REST_BASE_URL = "https://protheus.example.com";
    process.env.PROTHEUS_REST_REFRESH_TOKEN = "expired-refresh-token";
    process.env.PROTHEUS_REST_USER = "admin";
    process.env.PROTHEUS_REST_PASSWORD = "secret_password";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 401, message: "invalid_grant" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "token-gerado-com-senha",
            refresh_token: "novo-refresh-token",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new DatabaseProtheusTokenProvider();
    const token = await provider.getValidToken("empresa-001", true);

    expect(token).toBe("token-gerado-com-senha");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, secondCallOpts] = fetchMock.mock.calls[1];
    expect(secondCallOpts.body).toContain("grant_type=password");
    expect(secondCallOpts.body).toContain("username=admin");
  });

  it("buildAuthHeader forca renovacao e atualiza header Bearer", async () => {
    process.env.PROTHEUS_REST_BASE_URL = "https://protheus.example.com";
    process.env.PROTHEUS_REST_USER = "admin";
    process.env.PROTHEUS_REST_PASSWORD = "secret_password";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "bearer-token-atualizado",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const header = await buildAuthHeader(
      {
        baseUrl: "https://protheus.example.com",
        authMode: "bearer",
        token: "antigo-token",
        empresaId: "001",
        filial: "00101001",
        paths: {},
      },
      true
    );

    expect(header).toBe("Bearer bearer-token-atualizado");
  });
});
