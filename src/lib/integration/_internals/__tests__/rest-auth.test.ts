import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAuthHeader } from "../rest-auth";
import { ProtheusClientError } from "../../protheus-client";
import type { ProtheusRestConfig } from "../../rest-types";

vi.mock("../../protheus-token-provider", () => ({
  protheusTokenProvider: {
    getValidToken: vi.fn().mockResolvedValue("oauth-token"),
  },
}));

describe("rest-auth.ts", () => {
  const baseConfig: ProtheusRestConfig = {
    baseUrl: "https://api.example.com",
    empresaId: "emp-01",
    filial: "01",
    authMode: "basic",
    username: "user",
    password: "pass",
  };

  describe("buildAuthHeader", () => {
    it("usa basic auth como padrao", async () => {
      const result = await buildAuthHeader(baseConfig);
      expect(result).toBe("Basic dXNlcjpwYXNz");
    });

    it("usa basic auth com username e password validos", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        username: "admin",
        password: "secret123",
      };
      const result = await buildAuthHeader(config);
      expect(result).toBe("Basic YWRtaW46c2VjcmV0MTIz");
    });

    it("usa bearer auth quando configurado", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "bearer",
        token: "static-token",
      };
      const result = await buildAuthHeader(config);
      expect(result).toBe("Bearer static-token");
    });

    it("usa bearer auth com forceRefresh=false", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "bearer",
        token: "static-token",
      };
      const result = await buildAuthHeader(config, false);
      expect(result).toBe("Bearer static-token");
    });

    it("usa bearer auth com forceRefresh=true e token provider customizado", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "bearer",
        token: "static-token",
        tokenProvider: {
          getValidToken: vi.fn().mockResolvedValue("new-token"),
        },
      };
      const result = await buildAuthHeader(config, true);
      expect(result).toBe("Bearer new-token");
    });

    it("usa token estatico quando token provider falha", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "bearer",
        token: "static-token",
        tokenProvider: {
          getValidToken: vi.fn().mockRejectedValue(new Error("provider error")),
        },
      };
      const result = await buildAuthHeader(config, true);
      expect(result).toBe("Bearer static-token");
    });

    it("usa token estatico quando token provider retorna null", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "bearer",
        token: "static-token",
        tokenProvider: {
          getValidToken: vi.fn().mockResolvedValue(null),
        },
      };
      const result = await buildAuthHeader(config, true);
      expect(result).toBe("Bearer static-token");
    });

    it("usa oauth2 auth", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "oauth2",
        tokenProvider: {
          getValidToken: vi.fn().mockResolvedValue("oauth-token"),
        },
      };
      const result = await buildAuthHeader(config);
      expect(result).toBe("Bearer oauth-token");
    });

    it("usa oauth2 auth com forceRefresh", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "oauth2",
        tokenProvider: {
          getValidToken: vi.fn().mockResolvedValue("oauth-token-refreshed"),
        },
      };
      const result = await buildAuthHeader(config, true);
      expect(result).toBe("Bearer oauth-token-refreshed");
    });

    it("usa empresaSaaSId quando disponivel", async () => {
      const mockProvider = { getValidToken: vi.fn().mockResolvedValue("new-token") };
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "bearer",
        token: "static-token",
        empresaSaaSId: "saas-emp",
        tokenProvider: mockProvider,
      };
      await buildAuthHeader(config, true);
      expect(mockProvider.getValidToken).toHaveBeenCalledWith("saas-emp", true);
    });

    it("usa empresaId quando empresaSaaSId nao disponivel", async () => {
      const mockProvider = { getValidToken: vi.fn().mockResolvedValue("new-token") };
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "bearer",
        token: "static-token",
        tokenProvider: mockProvider,
      };
      await buildAuthHeader(config, true);
      expect(mockProvider.getValidToken).toHaveBeenCalledWith("emp-01", true);
    });

    it("usa oauth2 com provedor padrao quando tokenProvider nao fornecido", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "oauth2",
      };
      const result = await buildAuthHeader(config);
      expect(result).toBe("Bearer oauth-token");
    });

    it("usa bearer com provedor padrao quando tokenProvider nao fornecido", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "bearer",
        token: "static-token",
      };
      const result = await buildAuthHeader(config, true);
      expect(result).toBe("Bearer oauth-token");
    });

    it("lanca erro para basic sem username", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        username: "",
      };
      await expect(buildAuthHeader(config)).rejects.toThrow(ProtheusClientError);
    });

    it("lanca erro para basic sem password", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        password: "",
      };
      await expect(buildAuthHeader(config)).rejects.toThrow(ProtheusClientError);
    });

    it("lanca erro para bearer sem token", async () => {
      const config: ProtheusRestConfig = {
        ...baseConfig,
        authMode: "bearer",
        token: "",
      };
      await expect(buildAuthHeader(config)).rejects.toThrow(ProtheusClientError);
    });
  });
});