import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  exponentialBackoffWithJitter,
  fetchRowsFromFirstPath,
} from "../rest-retry";

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

    it("continua para próxima path quando erro é 400 (params inválidos neste Protheus)", async () => {
      const error400 = new Error("Protheus REST retornou 400 em /a");
      const get = vi.fn()
        .mockRejectedValueOnce(error400)
        .mockResolvedValueOnce([{ id: "1" }]);

      const result = await fetchRowsFromFirstPath(["/a", "/b"], get, () => [{ fallback: "true" }]);

      expect(result).toEqual([{ id: "1" }]);
      expect(get).toHaveBeenCalledTimes(2);
    });

    it("retorna fallback quando todos os paths retornam 400", async () => {
      const error400 = new Error("Protheus REST retornou 400 em /a");
      const get = vi.fn()
        .mockRejectedValueOnce(error400)
        .mockRejectedValueOnce(error400);

      const result = await fetchRowsFromFirstPath(["/a", "/b"], get, () => [{ fallback: "true" }]);

      expect(result).toEqual([{ fallback: "true" }]);
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
});
