import { describe, it, expect } from "vitest";
import { firstTruthy, buildRequestUrl } from "../rest-parse-url";

describe("rest-parse-url.ts", () => {
  describe("firstTruthy", () => {
    it("retorna primeiro valor truthy", () => {
      expect(firstTruthy("a", "b", "c")).toBe("a");
      expect(firstTruthy("", "b", "c")).toBe("b");
      expect(firstTruthy(null, undefined, "c")).toBe("c");
      expect(firstTruthy("", null, undefined)).toBe("");
    });
  });

  describe("buildRequestUrl", () => {
    const config = { baseUrl: "https://api.example.com", empresaId: "emp-01", filial: "01" };

    it("constrói URL a partir de caminho absoluto", () => {
      const url = buildRequestUrl("/api/v1/resource", config, "TEST_SETTING");
      expect(url.toString()).toBe("https://api.example.com/api/v1/resource?empresa=emp-01&filial=01");
    });

    it("mantém URL completa (https)", () => {
      const url = buildRequestUrl("https://other.com/api", config, "TEST_SETTING");
      expect(url.toString()).toBe("https://other.com/api?empresa=emp-01&filial=01");
    });

    it("mantém URL completa (http)", () => {
      const url = buildRequestUrl("http://localhost:3000/api", config, "TEST_SETTING");
      expect(url.toString()).toBe("http://localhost:3000/api?empresa=emp-01&filial=01");
    });

    it("não adiciona parâmetros quando path contém genericQuery", () => {
      const url = buildRequestUrl("/api/genericQuery/execute", config, "TEST_SETTING");
      expect(url.toString()).toBe("https://api.example.com/api/genericQuery/execute");
    });

    it("não adiciona parâmetros quando URL completa contém genericQuery", () => {
      const url = buildRequestUrl("https://api.example.com/genericQuery/test", config, "TEST_SETTING");
      expect(url.toString()).toBe("https://api.example.com/genericQuery/test");
    });

    it("lança erro para caminho relativo sem /", () => {
      expect(() => buildRequestUrl("api/v1/resource", config, "TEST_SETTING")).toThrow(
        'TEST_SETTING deve ser um caminho iniciado por "/" ou URL completa (https://...)'
      );
    });

    it("lança erro para caminho começando com //", () => {
      expect(() => buildRequestUrl("//api.example.com/resource", config, "TEST_SETTING")).toThrow(
        'TEST_SETTING deve ser um caminho iniciado por "/" ou URL completa (https://...)'
      );
    });
  });
});