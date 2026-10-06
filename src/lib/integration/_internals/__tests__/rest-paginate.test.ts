import { describe, expect, it, vi } from "vitest";
import { fetchAllPages, mergeAndDedupe } from "../rest-paginate";

describe("rest-paginate", () => {
  describe("fetchAllPages", () => {
    it("deve parar quando hasNext for false", async () => {
      const getPage = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: "1" }], hasNext: true })
        .mockResolvedValueOnce({ rows: [{ id: "2" }], hasNext: false });

      const rows = await fetchAllPages(getPage, { pageSize: 10 });
      expect(rows).toHaveLength(2);
      expect(getPage).toHaveBeenCalledTimes(2);
      expect(getPage).toHaveBeenNthCalledWith(1, 1, 10);
      expect(getPage).toHaveBeenNthCalledWith(2, 2, 10);
    });

    it("deve parar se rows for vazio, mesmo com hasNext=true", async () => {
      const getPage = vi.fn().mockResolvedValue({ rows: [], hasNext: true });
      const rows = await fetchAllPages(getPage);
      expect(rows).toHaveLength(0);
      expect(getPage).toHaveBeenCalledTimes(1);
    });
  });

  describe("mergeAndDedupe", () => {
    it("deve remover duplicatas baseado nos campos chaves", () => {
      const rows = [
        { ID: "A", NOME: "Jose" },
        { ID: "A", NOME: "Jose Clone" }, // Duplicata por ID
        { ID: "B", NOME: "Maria" },
      ];
      const result = mergeAndDedupe(rows, ["ID"]);
      expect(result).toHaveLength(2);
      expect(result[0].NOME).toBe("Jose");
      expect(result[1].NOME).toBe("Maria");
    });

    it("deve considerar multiplos campos para compor a chave", () => {
      const rows = [
        { LOJA: "01", COD: "1" },
        { LOJA: "02", COD: "1" },
        { LOJA: "01", COD: "1" }, // Duplicata
      ];
      const result = mergeAndDedupe(rows, ["LOJA", "COD"]);
      expect(result).toHaveLength(2);
    });
  });
});
