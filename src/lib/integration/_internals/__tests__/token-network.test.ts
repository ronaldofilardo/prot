import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveTokenUrl,
  parseJwtExpiry,
  isTokenExpired,
  executeOAuthRequest,
} from "../token-network";
import { ProtheusClientError } from "../../protheus-client";

vi.mock("@/lib/utils/logger", () => ({ logIntegration: vi.fn() }));

global.fetch = vi.fn();

describe("token-network.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.PROTHEUS_REST_TOKEN_PATH;
  });

  describe("resolveTokenUrl", () => {
    it("retorna URL limpa quando já contém /token", () => {
      expect(resolveTokenUrl("https://api.example.com/rest/api/oauth2/v1/token")).toBe(
        "https://api.example.com/rest/api/oauth2/v1/token"
      );
      expect(resolveTokenUrl("https://api.example.com/index/token")).toBe(
        "https://api.example.com/index/token"
      );
      expect(resolveTokenUrl("https://api.example.com/token")).toBe("https://api.example.com/token");
    });

    it("usa PROTHEUS_REST_TOKEN_PATH quando definido", () => {
      process.env.PROTHEUS_REST_TOKEN_PATH = "/custom/token";
      expect(resolveTokenUrl("https://api.example.com")).toBe(
        "https://api.example.com/custom/token"
      );
    });

    it("adiciona /rest/api/oauth2/v1/token quando baseUrl termina com /rest", () => {
      expect(resolveTokenUrl("https://api.example.com/rest")).toBe(
        "https://api.example.com/rest/api/oauth2/v1/token"
      );
    });

    it("adiciona /rest/api/oauth2/v1/token como padrão", () => {
      expect(resolveTokenUrl("https://api.example.com")).toBe(
        "https://api.example.com/rest/api/oauth2/v1/token"
      );
    });

    it("remove trailing slashes", () => {
      expect(resolveTokenUrl("https://api.example.com/")).toBe(
        "https://api.example.com/rest/api/oauth2/v1/token"
      );
    });
  });

  describe("parseJwtExpiry", () => {
    it("parseia expiração válida", () => {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify({ exp: 1735689600 })); // 2025-01-01
      const signature = btoa("signature");
      const token = `${header}.${payload}.${signature}`;

      const result = parseJwtExpiry(token);
      expect(result).toEqual(new Date(1735689600 * 1000));
    });

    it("retorna null para token sem payload", () => {
      const result = parseJwtExpiry("invalid");
      expect(result).toBeNull();
    });

    it("retorna null para token com payload inválido", () => {
      const result = parseJwtExpiry("header.invalid.signature");
      expect(result).toBeNull();
    });

    it("retorna null quando exp não existe", () => {
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const payload = btoa(JSON.stringify({ sub: "user" }));
      const token = `${header}.${payload}.signature`;
      const result = parseJwtExpiry(token);
      expect(result).toBeNull();
    });
  });

  describe("isTokenExpired", () => {
    it("retorna false para token sem expiração", () => {
      expect(isTokenExpired(null)).toBe(false);
      expect(isTokenExpired(undefined)).toBe(false);
    });

    it("retorna true para token expirado", () => {
      const past = new Date(Date.now() - 10000);
      expect(isTokenExpired(past)).toBe(true);
    });

    it("retorna false para token válido com margem", () => {
      const future = new Date(Date.now() + 100000); // 100 seconds
      expect(isTokenExpired(future)).toBe(false);
    });

    it("retorna true quando token expira dentro da margem", () => {
      const nearFuture = new Date(Date.now() + 30000); // 30 seconds
      expect(isTokenExpired(nearFuture, 60)).toBe(true); // 60 second margin
    });

    it("usa margem padrão de 60 segundos", () => {
      const nearFuture = new Date(Date.now() + 30000);
      expect(isTokenExpired(nearFuture)).toBe(true);
    });
  });

  describe("executeOAuthRequest", () => {
    it("retorna token quando resposta é ok", async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: "token123", expires_in: 3600 }),
      });

      const result = await executeOAuthRequest("https://api.example.com/token", "basicAuth", new URLSearchParams());

      expect(result.token).toBe("token123");
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("usa token alternativo quando access_token não existe", async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: "alt-token", expires_in: 3600 }),
      });

      const result = await executeOAuthRequest("https://api.example.com/token", "basicAuth", new URLSearchParams());

      expect(result.token).toBe("alt-token");
    });

    it("usa accessToken alternativo", async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: "alt-token2", expires_in: 3600 }),
      });

      const result = await executeOAuthRequest("https://api.example.com/token", "basicAuth", new URLSearchParams());

      expect(result.token).toBe("alt-token2");
    });

    it("lança erro quando token ausente na resposta", async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ expires_in: 3600 }),
      });

      await expect(
        executeOAuthRequest("https://api.example.com/token", "basicAuth", new URLSearchParams())
      ).rejects.toThrow(ProtheusClientError);
    });

    it("lança ProtheusClientError para status 400", async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(
        executeOAuthRequest("https://api.example.com/token", "basicAuth", new URLSearchParams())
      ).rejects.toThrow(ProtheusClientError);
    });

    it("lança ProtheusClientError para status 401", async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(
        executeOAuthRequest("https://api.example.com/token", "basicAuth", new URLSearchParams())
      ).rejects.toThrow(ProtheusClientError);
    });

    it("lança ProtheusClientError para outros status", async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        executeOAuthRequest("https://api.example.com/token", "basicAuth", new URLSearchParams())
      ).rejects.toThrow(ProtheusClientError);
    });

    it("envolve erro de rede em ProtheusClientError", async () => {
      (global.fetch as vi.Mock).mockRejectedValue(new Error("network error"));

      await expect(
        executeOAuthRequest("https://api.example.com/token", "basicAuth", new URLSearchParams())
      ).rejects.toThrow(ProtheusClientError);
    });

    it("adiciona Accept header para endpoint customizado", async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: "token123", expires_in: 3600 }),
      });

      await executeOAuthRequest("https://api.example.com/index/token", "basicAuth", new URLSearchParams());

      const call = (global.fetch as vi.Mock).mock.calls[0];
      expect(call[1].headers.Accept).toBe("application/json");
    });
  });
});