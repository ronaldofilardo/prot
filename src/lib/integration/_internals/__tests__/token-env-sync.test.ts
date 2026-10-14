import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getMemoryToken,
  clearMemoryToken,
  setMemoryToken,
} from "../token-env-sync";
import * as fs from "fs";
import { logIntegration } from "@/lib/utils/logger";

// O modulo usa `import fs from "fs"` (default), entao o mock precisa expor
// as mesmas funcoes tambem em `default`.
vi.mock("fs", () => {
  const mock = { existsSync: vi.fn(), readFileSync: vi.fn(), writeFileSync: vi.fn() };
  return { ...mock, default: mock };
});

vi.mock("path", () => {
  const mock = { resolve: vi.fn((cwd: string, file: string) => `${cwd}/${file}`) };
  return { ...mock, default: mock };
});

const { existsSync, readFileSync, writeFileSync } = vi.mocked(fs);

vi.mock("@/lib/utils/logger", () => ({
  logIntegration: vi.fn(),
}));

describe("token-env-sync.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks nao limpa implementacoes: evita vazar mockReturnValue/throw entre testes.
    existsSync.mockReset();
    readFileSync.mockReset();
    writeFileSync.mockReset();
    clearMemoryToken();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "");
    vi.stubEnv("VITEST", "");
    vi.stubEnv("PROTHEUS_REST_ACCESS_TOKEN", undefined);
    vi.stubEnv("PROTHEUS_REST_REFRESH_TOKEN", undefined);
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
      vi.stubEnv("NODE_ENV", "test");
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("test-token", expiresAt);

      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("não sincroniza .env em ambiente de teste (VITEST)", () => {
      vi.stubEnv("VITEST", "true");
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("test-token", expiresAt);

      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("não sincroniza .env quando accessToken é vazio", () => {
      vi.stubEnv("NODE_ENV", "production");
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("", expiresAt);

      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("não sincroniza .env quando accessToken contém JWT auto-renovado", () => {
      vi.stubEnv("NODE_ENV", "production");
      const expiresAt = new Date(Date.now() + 3600000);
      setMemoryToken("sig_totvs_fwjwt_auto_renew_abc", expiresAt);

      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("sincroniza .env em produção com token válido", () => {
      vi.stubEnv("NODE_ENV", "production");

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
      vi.stubEnv("NODE_ENV", "production");

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
      vi.stubEnv("NODE_ENV", "production");
      existsSync.mockReturnValue(false);

      const expiresAt = new Date(Date.now() + 3600000);
      expect(() => setMemoryToken("valid-token", expiresAt)).not.toThrow();
    });

    it("não falha quando fs.writeFileSync lança erro", () => {
      vi.stubEnv("NODE_ENV", "production");

      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('PROTHEUS_REST_ACCESS_TOKEN="old"');
      writeFileSync.mockImplementation(() => { throw new Error("permission denied"); });

      const expiresAt = new Date(Date.now() + 3600000);
      expect(() => setMemoryToken("valid-token", expiresAt)).not.toThrow();
    });

    it("loga sucesso ao atualizar .env", () => {
      vi.stubEnv("NODE_ENV", "production");

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