import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getMemoryToken,
  clearMemoryToken,
  setMemoryToken,
} from "../token-env-sync";
import { logIntegration } from "@/lib/utils/logger";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("path", () => ({
  resolve: vi.fn((cwd, file) => `${cwd}/${file}`),
}));

vi.mock("@/lib/utils/logger", () => ({
  logIntegration: vi.fn(),
}));

describe("token-env-sync.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMemoryToken();
    vi.unstubAllEnvs();
    delete process.env.NODE_ENV;
    delete process.env.VITEST;
    delete process.env.PROTHEUS_REST_ACCESS_TOKEN;
    delete process.env.PROTHEUS_REST_REFRESH_TOKEN;
  });

  afterEach(() => {
    clearMemoryToken();
  });

  describe("getMemoryToken", () => {
    it("retorna estado inicial vazio", () => {
      const state = getMemoryToken();
      expect(state).toEqual({
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
    });

    it("retorna estado após setMemoryToken", () => {
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("test-token", expiresAt, "refresh-123");

      const state = getMemoryToken();
      expect(state).toEqual({
        accessToken: "test-token",
        refreshToken: "refresh-123",
        expiresAt,
      });
    });
  });

  describe("clearMemoryToken", () => {
    it("limpa estado da memória", () => {
      setMemoryToken("test-token", new Date(), "refresh-123");
      clearMemoryToken();

      const state = getMemoryToken();
      expect(state).toEqual({
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
    });
  });

  describe("setMemoryToken", () => {
    it("define accessToken e expiresAt", () => {
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("new-token", expiresAt);

      const state = getMemoryToken();
      expect(state.accessToken).toBe("new-token");
      expect(state.expiresAt).toBe(expiresAt);
      expect(state.refreshToken).toBeNull();
    });

    it("define refreshToken quando fornecido", () => {
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("new-token", expiresAt, "refresh-456");

      const state = getMemoryToken();
      expect(state.refreshToken).toBe("refresh-456");
    });

    it("atualiza variáveis de ambiente", () => {
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("env-token", expiresAt, "env-refresh");

      expect(process.env.PROTHEUS_REST_ACCESS_TOKEN).toBe("env-token");
      expect(process.env.PROTHEUS_REST_REFRESH_TOKEN).toBe("env-refresh");
    });

    it("não define PROTHEUS_REST_REFRESH_TOKEN quando não fornecido", () => {
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("env-token", expiresAt);

      expect(process.env.PROTHEUS_REST_REFRESH_TOKEN).toBeUndefined();
    });

    it("não sincroniza .env em ambiente de teste (NODE_ENV=test)", () => {
      process.env.NODE_ENV = "test";
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("test-token", expiresAt);

      const { writeFileSync } = require("fs");
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("não sincroniza .env em ambiente de teste (VITEST)", () => {
      process.env.VITEST = "true";
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("test-token", expiresAt);

      const { writeFileSync } = require("fs");
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("não sincroniza .env quando accessToken é vazio", () => {
      process.env.NODE_ENV = "production";
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("", expiresAt);

      const { writeFileSync } = require("fs");
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("não sincroniza .env quando accessToken contém JWT auto-renovado", () => {
      process.env.NODE_ENV = "production";
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("sig_totvs_fwjwt_auto_renew_abc", expiresAt);

      const { writeFileSync } = require("fs");
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("sincroniza .env em produção com token válido", () => {
      process.env.NODE_ENV = "production";
      const { existsSync } = require("fs");
      const { readFileSync } = require("fs");
      const { writeFileSync } = require("fs");

      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('PROTHEUS_REST_ACCESS_TOKEN="old"\nOTHER="value"');

      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("new-production-token", expiresAt, "new-refresh");

      expect(writeFileSync).toHaveBeenCalled();
      const writtenContent = writeFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('PROTHEUS_REST_ACCESS_TOKEN="new-production-token"');
      expect(writtenContent).toContain('PROTHEUS_REST_REFRESH_TOKEN="new-refresh"');
      expect(writtenContent).toContain('OTHER="value"');
    });

    it("sincroniza .env sem refreshToken", () => {
      process.env.NODE_ENV = "production";
      const { existsSync } = require("fs");
      const { readFileSync } = require("fs");
      const { writeFileSync } = require("fs");

      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('PROTHEUS_REST_ACCESS_TOKEN="old"\nPROTHEUS_REST_REFRESH_TOKEN="old-refresh"');

      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("new-token", expiresAt);

      expect(writeFileSync).toHaveBeenCalled();
      const writtenContent = writeFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('PROTHEUS_REST_ACCESS_TOKEN="new-token"');
      // refreshToken não deve ser atualizado quando não fornecido
      expect(writtenContent).toContain('PROTHEUS_REST_REFRESH_TOKEN="old-refresh"');
    });

    it("não falha quando .env não existe", () => {
      process.env.NODE_ENV = "production";
      const { existsSync } = require("fs");
      existsSync.mockReturnValue(false);

      const expiresAt = new Date(Date.now() + 3600000);
      expect(() => setMemoryToken("valid-token", expiresAt)).not.toThrow();
    });

    it("não falha quando fs.writeFileSync lança erro", () => {
      process.env.NODE_ENV = "production";
      const { existsSync } = require("fs");
      const { readFileSync } = require("fs");
      const { writeFileSync } = require("fs");

      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('PROTHEUS_REST_ACCESS_TOKEN="old"');
      writeFileSync.mockImplementation(() => { throw new Error("permission denied"); });

      const expiresAt = new Date(Date.now() + 3600000);
      expect(() => setMemoryToken("valid-token", expiresAt)).not.toThrow();
    });

    it("loga sucesso ao atualizar .env", () => {
      process.env.NODE_ENV = "production";
      const { existsSync } = require("fs");
      const { readFileSync } = require("fs");
      const { writeFileSync } = require("fs");

      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('PROTHEUS_REST_ACCESS_TOKEN="old"');

      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("valid-token", expiresAt);

      expect(logIntegration).toHaveBeenCalledWith(
        "Arquivo .env atualizado com novos tokens Protheus",
        { expiraEm: expiresAt }
      );
    });
  });
});