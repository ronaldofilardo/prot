import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  exponentialBackoffWithJitter,
  fetchRowsFromFirstPath,
  fetchFirstNonEmptyOrThrow,
  fetchFirstNonEmptySwallowingErrors,
  executeFetch,
} from "../rest-retry";
import { ProtheusClientError } from "../../protheus-client";

global.fetch = vi.fn();

describe("rest-retry.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("exponentialBackoffWithJitter", () => {
    it("calcula delay exponencial sem jitter quando 0", () => {
      const result = exponentialBackoffWithJitter(0, 10000);
      expect(result).toBeGreaterThanOrEqual(1000);
      expect(result).toBeLessThanOrEqual(1300); // 1000 + jitter
    });

    it("aumenta delay exponencialmente", () => {
      const result0 = exponentialBackoffWithJitter(0, 10000);
      const result1 = exponentialBackoffWithJitter(1, 10000);
      const result2 = exponentialBackoffWithJitter(2, 10000);

      expect(result1).toBeGreaterThan(result0);
      expect(result2).toBeGreaterThan(result1);
    });

    it("respeita cap máximo", () => {
      const result = exponentialBackoffWithJitter(10, 100);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("retorna 0 para attempt 0 com cap 0", () => {
      const result = exponentialBackoffWithJitter(0, 0);
      expect(result).toBe(0);
    });
  });

  describe("fetchRowsFromFirstPath", () => {
    it("retorna primeira resposta válida", async () => {
      const get = vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce([{ id: "1" }])
        .mockResolvedValueOnce([{ id: "2" }]);

      const result = await fetchRowsFromFirstPath(["/a", "/b", "/c"], get, () => [{ fallback: "true" }]);

      expect(result).toEqual([{ id: "1" }]);
      expect(get).toHaveBeenCalledTimes(2);
    });

    it("retorna fallback quando todas retornam 404", async () => {
      const error404 = new Error("404 Not Found");
      const get = vi.fn()
        .mockRejectedValueOnce(error404)
        .mockRejectedValueOnce(error404);

      const result = await fetchRowsFromFirstPath(["/a", "/b"], get, () => [{ fallback: "true" }]);

      expect(result).toEqual([{ fallback: "true" }]);
    });

    it("propaga erro não-404", async () => {
      const error500 = new Error("500 Internal Server Error");
      const get = vi.fn().mockRejectedValueOnce(error500);

      await expect(
        fetchRowsFromFirstPath(["/a", "/b"], get, () => [{ fallback: "true" }])
      ).rejects.toThrow("500 Internal Server Error");
    });

    it("retorna array vazio quando sem erro e sem resultados", async () => {
      const get = vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await fetchRowsFromFirstPath(["/a", "/b"], get, () => [{ fallback: "true" }]);

      expect(result).toEqual([]);
    });

    it("continua para próxima path quando erro é 404", async () => {
      const error404 = new Error("404 Not Found");
      const get = vi.fn()
        .mockRejectedValueOnce(error404)
        .mockResolvedValueOnce([{ id: "1" }]);

      const result = await fetchRowsFromFirstPath(["/a", "/b"], get, () => [{ fallback: "true" }]);

      expect(result).toEqual([{ id: "1" }]);
    });

    it("lança erro não-404 após 404", async () => {
      const error404 = new Error("404 Not Found");
      const error500 = new Error("500 Internal Server Error");
      const get = vi.fn()
        .mockRejectedValueOnce(error404)
        .mockRejectedValueOnce(error500);

      await expect(
        fetchRowsFromFirstPath(["/a", "/b"], get, () => [{ fallback: "true" }])
      ).rejects.toThrow("500 Internal Server Error");
    });
  });

  describe("fetchFirstNonEmptyOrThrow", () => {
    it("retorna primeira resposta não-vazia", async () => {
      const get = vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "1" }]);

      const result = await fetchFirstNonEmptyOrThrow(["/a", "/b"], get);

      expect(result).toEqual([{ id: "1" }]);
    });

    it("lança erro quando todas vazias e houve erro 404", async () => {
      const error404 = new Error("404 Not Found");
      const get = vi.fn()
        .mockRejectedValueOnce(error404)
        .mockResolvedValueOnce([]);

      await expect(fetchFirstNonEmptyOrThrow(["/a", "/b"], get)).rejects.toThrow("404 Not Found");
    });

    it("lança erro quando todas vazias e houve erro não-404", async () => {
      const error500 = new Error("500 Internal Server Error");
      const get = vi.fn()
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce([]);

      await expect(fetchFirstNonEmptyOrThrow(["/a", "/b"], get)).rejects.toThrow("500 Internal Server Error");
    });

    it("retorna null quando todas vazias sem erro", async () => {
      const get = vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await fetchFirstNonEmptyOrThrow(["/a", "/b"], get);

      expect(result).toBeNull();
    });

    it("continua para próxima path quando erro é 404", async () => {
      const error404 = new Error("404 Not Found");
      const get = vi.fn()
        .mockRejectedValueOnce(error404)
        .mockResolvedValueOnce([{ id: "1" }]);

      const result = await fetchFirstNonEmptyOrThrow(["/a", "/b"], get);

      expect(result).toEqual([{ id: "1" }]);
    });

    it("lança erro não-404 imediatamente", async () => {
      const error500 = new Error("500 Internal Server Error");
      const get = vi.fn().mockRejectedValueOnce(error500);

      await expect(fetchFirstNonEmptyOrThrow(["/a", "/b"], get)).rejects.toThrow("500 Internal Server Error");
    });
  });

  describe("fetchFirstNonEmptySwallowingErrors", () => {
    it("retorna primeira resposta não-vazia", async () => {
      const get = vi.fn()
        .mockRejectedValueOnce(new Error("error"))
        .mockResolvedValueOnce([{ id: "1" }]);

      const result = await fetchFirstNonEmptySwallowingErrors(["/a", "/b"], get);

      expect(result).toEqual([{ id: "1" }]);
    });

    it("retorna null quando todas vazias ou erro", async () => {
      const get = vi.fn()
        .mockRejectedValueOnce(new Error("error"))
        .mockResolvedValueOnce([]);

      const result = await fetchFirstNonEmptySwallowingErrors(["/a", "/b"], get);

      expect(result).toBeNull();
    });

    it("engole todos os erros e continua", async () => {
      const get = vi.fn()
        .mockRejectedValueOnce(new Error("error 1"))
        .mockRejectedValueOnce(new Error("error 2"))
        .mockRejectedValueOnce(new Error("error 3"));

      const result = await fetchFirstNonEmptySwallowingErrors(["/a", "/b", "/c"], get);

      expect(result).toBeNull();
    });

    it("retorna array vazio se resposta vazia", async () => {
      const get = vi.fn().mockResolvedValueOnce([]);

      const result = await fetchFirstNonEmptySwallowingErrors(["/a"], get);

      expect(result).toBeNull();
    });
  });

  describe("executeFetch", () => {
    it("faz fetch com headers corretos", async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({}) };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await executeFetch("https://api.example.com", "Bearer token", "/test");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer token",
            Accept: "application/json",
          },
        })
      );
      expect(result).toBe(mockResponse);
    });

    it("lança ProtheusClientError quando fetch falha", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

      await expect(
        executeFetch("https://api.example.com", "Bearer token", "/test")
      ).rejects.toThrow(ProtheusClientError);
    });

    it("lança ProtheusClientError quando resposta é undefined", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        executeFetch("https://api.example.com", "Bearer token", "/test")
      ).rejects.toThrow(ProtheusClientError);
    });
  });
});