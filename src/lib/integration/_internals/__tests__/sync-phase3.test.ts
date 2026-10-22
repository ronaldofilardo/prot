import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAllPages } from "../rest-paginate";
import { fetchPage } from "../rest-fetch";
import { applyWhereToPath, buildWhereClause, getSyncDataCorte } from "../sync-filter-date";
import { executeFetch, fetchRowsFromFirstPath, getFetchTimeoutMs } from "../rest-retry";
import { ProtheusClientError } from "../../protheus-client";
import type { ProtheusRestConfig } from "../rest-types";

describe("Fase 3 — Paginação Segura, Filtro de Data, Timeout e Retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Guarda de ciclo e encerramento em fetchAllPages", () => {
    it("encerra paginação se a primeira linha se repetir mesmo com hasNext: true", async () => {
      const getPage = vi.fn().mockResolvedValue({
        rows: [{ ID: "001", NOME: "Repetido" }, { ID: "002" }],
        hasNext: true,
      });

      const rows = await fetchAllPages(getPage, { pageSize: 2 });
      // Página 1 processa 2 linhas; na página 2 a 1ª linha é idêntica, então encerra
      expect(getPage).toHaveBeenCalledTimes(2);
      expect(rows).toHaveLength(2);
    });

    it("encerra imediatamente se a página vier vazia", async () => {
      const getPage = vi.fn().mockResolvedValue({ rows: [], hasNext: true });
      const rows = await fetchAllPages(getPage);
      expect(getPage).toHaveBeenCalledTimes(1);
      expect(rows).toEqual([]);
    });

    it("respeita o limite máximo de páginas", async () => {
      let counter = 0;
      const getPage = vi.fn().mockImplementation(() => {
        counter++;
        return Promise.resolve({
          rows: [{ ID: `item-${counter}` }],
          hasNext: true,
        });
      });

      const rows = await fetchAllPages(getPage, { pageSize: 1, maxPages: 5 });
      expect(getPage).toHaveBeenCalledTimes(5);
      expect(rows).toHaveLength(5);
    });

    it("para a paginação quando o deadline é atingido e retorna parcial", async () => {
      const getPage = vi.fn().mockImplementation(() =>
        Promise.resolve({ rows: [{ ID: "x" }], hasNext: true })
      );

      const rows = await fetchAllPages(getPage, { pageSize: 1, deadlineMs: 0 });
      expect(getPage).not.toHaveBeenCalled();
      expect(rows).toEqual([]);
    });

    it("continua paginando normalmente quando deadline não estoura", async () => {
      let counter = 0;
      const getPage = vi.fn().mockImplementation(() => {
        counter++;
        if (counter > 3) return Promise.resolve({ rows: [], hasNext: false });
        return Promise.resolve({ rows: [{ ID: `p${counter}` }], hasNext: true });
      });

      const rows = await fetchAllPages(getPage, { pageSize: 1, deadlineMs: 60_000 });
      expect(getPage).toHaveBeenCalledTimes(4);
      expect(rows).toHaveLength(3);
    });
  });

  describe("Filtro de Data e Cláusula WHERE", () => {
    it("calcula corte de 12 meses no formato YYYYMMDD", () => {
      const corte = getSyncDataCorte(12);
      expect(corte).toMatch(/^\d{8}$/);
    });

    it("monta where clause preservando títulos em aberto para SE1 e SE2", () => {
      expect(buildWhereClause("SF2", "20250101")).toBe("F2_EMISSAO >= '20250101'");
      expect(buildWhereClause("SD2", "20250101")).toBe("D2_EMISSAO >= '20250101'");
      expect(buildWhereClause("SE1", "20250101")).toBe("E1_SALDO > 0 OR E1_EMISSAO >= '20250101'");
      expect(buildWhereClause("SE2", "20250101")).toBe("E2_SALDO > 0 OR E2_EMISSAO >= '20250101'");
      expect(buildWhereClause("SE5", "20250101")).toBe("E5_DATA >= '20250101'");
    });

    it("aplica where em caminhos genericQuery sem duplicar se já existir", () => {
      const pathSF2 = "/rest/api/framework/v1/genericQuery?tables=SF2&fields=F2_DOC";
      const applied = applyWhereToPath(pathSF2, "20250101");
      expect(applied).toContain("where=F2_EMISSAO%20%3E%3D%20'20250101'");

      // Se já tiver where, não altera
      const alreadyHasWhere = "/rest/api/framework/v1/genericQuery?tables=SF2&where=custom";
      expect(applyWhereToPath(alreadyHasWhere, "20250101")).toBe(alreadyHasWhere);
    });
  });

  describe("Parâmetros de página na URL", () => {
    it("padroniza para pageSize sem duplicar pagesize", async () => {
      const globalFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [] }),
        text: () => Promise.resolve(JSON.stringify({ items: [] })),
      });
      global.fetch = globalFetch;

      const config: ProtheusRestConfig = {
        baseUrl: "https://protheus.example.com",
        empresaId: "emp-01",
        filial: "01",
        authMode: "basic",
        username: "admin",
        password: "secret",
        token: "",
        paths: {},
      };

      await fetchPage("/rest/api/framework/v1/genericQuery?tables=SA1&pagesize=500", config, "TEST", 1, 100);

      const calledUrl = globalFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("page=1");
      expect(calledUrl).toContain("pageSize=500");
      expect(calledUrl).not.toContain("pagesize=");
    });
  });

  describe("Timeout e Retry", () => {
    it("usa timeout padrão de 25s", () => {
      expect(getFetchTimeoutMs()).toBe(25000);
    });

    it("retenta em 500 até 2 vezes e retorna resposta", async () => {
      const fail500 = { ok: false, status: 500, statusText: "Internal Error" };
      const success200 = { ok: true, status: 200, json: () => Promise.resolve({}) };
      const globalFetch = vi.fn()
        .mockResolvedValueOnce(fail500)
        .mockResolvedValueOnce(success200);
      global.fetch = globalFetch;

      const res = await executeFetch("https://api.test", "auth", "/path");
      expect(globalFetch).toHaveBeenCalledTimes(2);
      expect(res.status).toBe(200);
    });

    it("não retenta em 4xx e devolve resposta diretamente", async () => {
      const clientError404 = { ok: false, status: 404, statusText: "Not Found" };
      const globalFetch = vi.fn().mockResolvedValue(clientError404);
      global.fetch = globalFetch;

      const res = await executeFetch("https://api.test", "auth", "/path");
      expect(globalFetch).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(404);
    });

    it("registra log de path quando fetchRowsFromFirstPath responde", async () => {
      const get = vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]);
      const rows = await fetchRowsFromFirstPath(["/endpoint-a"], get, () => []);
      expect(rows).toHaveLength(2);
      expect(get).toHaveBeenCalledWith("/endpoint-a");
    });
  });
});
