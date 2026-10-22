import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchFirstNonEmptyOrThrow,
  fetchFirstNonEmptySwallowingErrors,
  executeFetch,
} from "../rest-retry";
import { ProtheusClientError } from "../../protheus-client";

global.fetch = vi.fn();

describe("rest-retry.ts — fetch de paths e executeFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
