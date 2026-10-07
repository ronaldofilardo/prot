import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchDbToken } from "../token-db-fetch";
import { ProtheusClientError } from "../../protheus-client";
import type { ProtheusCredencialData } from "../token-types";

vi.mock("@/lib/security/crypto-vault", () => ({
  decryptText: vi.fn((text) => text.replace("enc_", "")),
}));

vi.mock("@/lib/utils/logger", () => ({
  logIntegration: vi.fn(),
}));

vi.mock("../token-network", () => ({
  executeOAuthRequest: vi.fn(),
  resolveTokenUrl: vi.fn((url) => `${url}/token`),
}));

vi.mock("../token-generator", () => ({
  createProtheusJwt: vi.fn(() => ({
    token: "fallback-jwt-token",
    expiresAt: new Date(Date.now() + 3600000),
  })),
}));

const mockCred: ProtheusCredencialData = {
  empresaId: "emp-01",
  clientId: "client-1",
  username: "user",
  passwordEnc: "enc_password123",
  baseUrl: "https://api.example.com",
  accessToken: "existing-token",
};

describe("token-db-fetch.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("PROTHEUS_REST_ACCESS_TOKEN", "");
  });

  it("retorna token quando executeOAuthRequest funciona", async () => {
    const { executeOAuthRequest } = await import("../token-network");
    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "new-token",
      refreshToken: "refresh-123",
      expiresAt: new Date(Date.now() + 3600000),
    });

    const result = await fetchDbToken(mockCred);

    expect(result).toEqual({
      accessToken: "new-token",
      refreshToken: "refresh-123",
      expiresAt: expect.any(Date),
    });
    expect(executeOAuthRequest).toHaveBeenCalledWith(
      "https://api.example.com/token",
      expect.any(String),
      expect.any(URLSearchParams)
    );
  });

  it("lança erro de credenciais inválidas do ProtheusClientError", async () => {
    const { executeOAuthRequest } = await import("../token-network");
    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ProtheusClientError("Credenciais Protheus invalidas ou nao autorizadas")
    );

    await expect(fetchDbToken(mockCred)).rejects.toThrow(ProtheusClientError);
  });

  it("usa accessToken existente quando não é JWT auto-renovado", async () => {
    const { executeOAuthRequest } = await import("../token-network");
    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const credWithToken: ProtheusCredencialData = {
      ...mockCred,
      accessToken: "valid-existing-token",
    };

    const result = await fetchDbToken(credWithToken);

    expect(result.accessToken).toBe("valid-existing-token");
    expect(result.refreshToken).toBeNull();
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("não usa accessToken existente quando é JWT auto-renovado", async () => {
    const { executeOAuthRequest } = await import("../token-network");
    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const credWithJwt: ProtheusCredencialData = {
      ...mockCred,
      accessToken: "sig_totvs_fwjwt_auto_renew_abc123",
    };

    const result = await fetchDbToken(credWithJwt);

    expect(result.accessToken).not.toBe("sig_totvs_fwjwt_auto_renew_abc123");
  });

  it("usa token de ambiente quando accessToken não disponível", async () => {
    const { executeOAuthRequest } = await import("../token-network");
    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const credNoToken: ProtheusCredencialData = {
      ...mockCred,
      accessToken: "",
    };
    vi.stubEnv("PROTHEUS_REST_ACCESS_TOKEN", "env-token-123");

    const result = await fetchDbToken(credNoToken);

    expect(result.accessToken).toBe("env-token-123");
  });

  it("não usa token de ambiente quando é JWT auto-renovado", async () => {
    const { executeOAuthRequest } = await import("../token-network");
    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const credNoToken: ProtheusCredencialData = {
      ...mockCred,
      accessToken: "",
    };
    vi.stubEnv("PROTHEUS_REST_ACCESS_TOKEN", "sig_totvs_fwjwt_auto_renew_env");

    const result = await fetchDbToken(credNoToken);

    expect(result.accessToken).not.toBe("sig_totvs_fwjwt_auto_renew_env");
  });

  it("cria JWT fallback quando tudo falha", async () => {
    const { executeOAuthRequest } = await import("../token-network");
    const { logIntegration } = await import("@/lib/utils/logger");
    const { createProtheusJwt } = await import("../token-generator");

    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const credNoToken: ProtheusCredencialData = {
      ...mockCred,
      accessToken: "",
    };

    const result = await fetchDbToken(credNoToken);

    expect(logIntegration).toHaveBeenCalledWith(
      "Protheus remoto inacessivel no momento. Emitindo token ativo para a empresa",
      { empresaId: "emp-01" }
    );
    expect(createProtheusJwt).toHaveBeenCalledWith("user");
    expect(result.accessToken).toBe("fallback-jwt-token");
  });

  it("usa clientId:clientId para basic auth", async () => {
    const { executeOAuthRequest } = await import("../token-network");
    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "new-token",
      expiresAt: new Date(Date.now() + 3600000),
    });

    await fetchDbToken(mockCred);

    const callArgs = (executeOAuthRequest as ReturnType<typeof vi.fn>).mock.calls[0];
    const basicAuth = callArgs[1];
    // Buffer.from("client-1:client-1").toString("base64")
    expect(basicAuth).toBe("Y2xpZW50LTE6Y2xpZW50LTE=");
  });

  it("usa grant_type password no body", async () => {
    const { executeOAuthRequest } = await import("../token-network");
    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "new-token",
      expiresAt: new Date(Date.now() + 3600000),
    });

    await fetchDbToken(mockCred);

    const callArgs = (executeOAuthRequest as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = callArgs[2];
    expect(body.get("grant_type")).toBe("password");
    expect(body.get("username")).toBe("user");
    expect(body.get("password")).toBe("password123"); // decrypted
  });

  it("usa resolveTokenUrl para construir URL", async () => {
    const { executeOAuthRequest, resolveTokenUrl } = await import("../token-network");
    (executeOAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "new-token",
      expiresAt: new Date(Date.now() + 3600000),
    });
    (resolveTokenUrl as ReturnType<typeof vi.fn>).mockReturnValue("https://custom/token");

    await fetchDbToken(mockCred);

    expect(resolveTokenUrl).toHaveBeenCalledWith("https://api.example.com");
    expect(executeOAuthRequest).toHaveBeenCalledWith(
      "https://custom/token",
      expect.any(String),
      expect.any(URLSearchParams)
    );
  });
});