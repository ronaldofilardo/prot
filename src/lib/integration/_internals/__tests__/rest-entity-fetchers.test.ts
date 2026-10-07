import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchEmpresa,
  fetchFiliais,
  fetchClientes,
  fetchFaturamentos,
  fetchContasReceber,
  fetchBaixas,
  fetchSaldosContabeis,
  mergeAndDedupe,
} from "../rest-entity-fetchers";
import type { ProtheusRestConfig } from "../rest-types";

vi.mock("../rest-mock", () => ({
  buildFallbackClientesRows: vi.fn(() => [{ A1_COD: "000001", A1_LOJA: "01", A1_NOME: "CLIENTE TESTE" }]),
  buildFallbackFaturamentosRows: vi.fn(() => [{ F2_DOC: "000001", F2_SERIE: "1", F2_CLIENTE: "000001", F2_LOJA: "01" }]),
  buildFallbackContasReceberRows: vi.fn(() => [{ E1_PREFIXO: "1", E1_NUM: "000001", E1_PARCELA: "1", E1_CLIENTE: "000001", E1_LOJA: "01" }]),
  buildFallbackFilial: vi.fn((empresaId, filial) => ({
    codigoEmpresa: empresaId || "001",
    codigoUnidade: "01",
    codigoFilial: filial || "001",
    filialCompleta: filial || "00101001",
    nome: "FILIAL TESTE",
    tipo: "Matriz",
    status: "Ativa",
  })),
}));

vi.mock("../rest-parse", () => ({
  mapEmpresaInfo: vi.fn((rows) => ({ id: "emp-1", nome: "Empresa Teste", cnpj: "12345678000195" })),
  mapRowToFilial: vi.fn(() => ({
    id: "filial-dup", // mesmo ID para testar deduplicação
    codigoEmpresa: "emp-01",
    codigoFilial: "01",
    cnpj: "",
    nome: "Filial Teste",
    filialCompleta: "00101001",
  })),
}));

vi.mock("../rest-paths", () => ({
  CLIENTES_FALLBACK_PATHS: ["/api/clientes"],
  FATURAMENTOS_FALLBACK_PATHS: ["/api/faturamentos"],
  CONTAS_RECEBER_FALLBACK_PATHS: ["/api/contas-receber"],
  BAIXAS_FALLBACK_PATHS: ["/api/baixas"],
  EMPRESA_FALLBACK_PATHS: ["/api/empresa"],
  FILIAIS_FALLBACK_PATHS: ["/api/filiais"],
  SALDOS_CONTABEIS_FALLBACK_PATHS: ["/api/saldos"],
  buildCandidatePaths: vi.fn((custom, paths) => custom ? [custom, ...paths] : paths),
}));

vi.mock("../rest-retry", () => ({
  fetchFirstNonEmptyOrThrow: vi.fn(),
  fetchFirstNonEmptySwallowingErrors: vi.fn(),
  fetchRowsFromFirstPath: vi.fn(),
}));

const mockConfig: ProtheusRestConfig = {
  baseUrl: "https://api.example.com",
  empresaId: "emp-01",
  filial: "01",
  paths: {
    empresa: "/api/empresa",
    clientes: "/api/clientes",
    faturamentos: "/api/faturamentos",
    contasReceber: "/api/contas-receber",
    baixas: "/api/baixas",
    saldosContabeis: "/api/saldos",
    filiais: "/api/filiais",
  },
};

describe("rest-entity-fetchers.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.PROTHEUS_REST_EMPRESA_PATH;
    delete process.env.PROTHEUS_REST_FILIAIS_PATH;
    delete process.env.PROTHEUS_REST_CLIENTES_PATH;
    delete process.env.PROTHEUS_REST_FATURAMENTOS_PATH;
    delete process.env.PROTHEUS_REST_CONTAS_RECEBER_PATH;
    delete process.env.PROTHEUS_REST_BAIXAS_PATH;
    delete process.env.PROTHEUS_REST_SALDOS_CONTABEIS_PATH;
  });

  describe("mergeAndDedupe", () => {
    it("remove duplicatas baseado nas chaves", () => {
      const rows = [
        { A1_COD: "001", A1_LOJA: "01", A1_NOME: "A" },
        { A1_COD: "001", A1_LOJA: "01", A1_NOME: "B" },
        { A1_COD: "002", A1_LOJA: "01", A1_NOME: "C" },
      ];
      const result = mergeAndDedupe(rows, ["A1_COD", "A1_LOJA"]);
      expect(result).toHaveLength(2);
      expect(result[0].A1_NOME).toBe("A");
      expect(result[1].A1_NOME).toBe("C");
    });

    it("retorna array vazio para entrada vazia", () => {
      const result = mergeAndDedupe([], ["A1_COD"]);
      expect(result).toEqual([]);
    });

    it("mantém todas linhas quando não há duplicatas", () => {
      const rows = [
        { A1_COD: "001", A1_LOJA: "01" },
        { A1_COD: "002", A1_LOJA: "01" },
      ];
      const result = mergeAndDedupe(rows, ["A1_COD", "A1_LOJA"]);
      expect(result).toHaveLength(2);
    });

    it("usa string vazia para chaves ausentes", () => {
      const rows = [
        { A1_COD: "001", A1_LOJA: "01" },
        { A1_COD: "001" }, // sem A1_LOJA
      ];
      const result = mergeAndDedupe(rows, ["A1_COD", "A1_LOJA"]);
      expect(result).toHaveLength(2); // chaves diferentes: "001|01" vs "001|"
    });
  });

  describe("fetchEmpresa", () => {
    it("retorna empresa mapeada quando encontra linhas", async () => {
      const { fetchFirstNonEmptyOrThrow } = await import("../rest-retry");
      (fetchFirstNonEmptyOrThrow as vi.Mock).mockResolvedValue([{ id: "1" }]);

      const result = await fetchEmpresa(mockConfig, undefined, vi.fn());

      expect(fetchFirstNonEmptyOrThrow).toHaveBeenCalled();
      expect(result).toEqual({ id: "emp-1", nome: "Empresa Teste", cnpj: "12345678000195" });
    });

    it("retorna null quando não encontra linhas", async () => {
      const { fetchFirstNonEmptyOrThrow } = await import("../rest-retry");
      (fetchFirstNonEmptyOrThrow as vi.Mock).mockResolvedValue(null);

      const result = await fetchEmpresa(mockConfig, undefined, vi.fn());

      expect(result).toBeNull();
    });

    it("usa customPath quando fornecido", async () => {
      const { fetchFirstNonEmptyOrThrow } = await import("../rest-retry");
      (fetchFirstNonEmptyOrThrow as vi.Mock).mockResolvedValue([{ id: "1" }]);
      const { buildCandidatePaths } = await import("../rest-paths");

      await fetchEmpresa(mockConfig, "/custom/empresa", vi.fn());

      expect(buildCandidatePaths).toHaveBeenCalledWith("/custom/empresa", expect.any(Array));
    });

    it("inclui path do env quando disponível", async () => {
      process.env.PROTHEUS_REST_EMPRESA_PATH = "/env/empresa";
      const { fetchFirstNonEmptyOrThrow } = await import("../rest-retry");
      (fetchFirstNonEmptyOrThrow as vi.Mock).mockResolvedValue([{ id: "1" }]);
      const { buildCandidatePaths } = await import("../rest-paths");

      await fetchEmpresa(mockConfig, undefined, vi.fn());

      expect(buildCandidatePaths).toHaveBeenCalledWith(undefined, expect.arrayContaining(["/env/empresa"]));
    });
  });

  describe("fetchFiliais", () => {
    it("retorna filiais mapeadas quando encontra linhas", async () => {
      const { fetchFirstNonEmptySwallowingErrors } = await import("../rest-retry");
      (fetchFirstNonEmptySwallowingErrors as vi.Mock).mockResolvedValue([{ id: "1" }, { id: "2" }]);

      const result = await fetchFiliais(mockConfig, undefined, vi.fn());

      // deduplicação remove duplicatas
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", "filial-dup");
    });

    it("retorna fallback quando não encontra linhas", async () => {
      const { fetchFirstNonEmptySwallowingErrors } = await import("../rest-retry");
      (fetchFirstNonEmptySwallowingErrors as vi.Mock).mockResolvedValue(null);

      const result = await fetchFiliais(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
      expect(result[0].codigoEmpresa).toBe("emp-01");
    });

    it("retorna fallback quando array vazio", async () => {
      const { fetchFirstNonEmptySwallowingErrors } = await import("../rest-retry");
      (fetchFirstNonEmptySwallowingErrors as vi.Mock).mockResolvedValue([]);

      const result = await fetchFiliais(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("remove duplicatas de filiais", async () => {
      const { fetchFirstNonEmptySwallowingErrors } = await import("../rest-retry");
      (fetchFirstNonEmptySwallowingErrors as vi.Mock).mockResolvedValue([{ id: "1" }, { id: "1" }]);

      const result = await fetchFiliais(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa customPath quando fornecido", async () => {
      const { buildCandidatePaths } = await import("../rest-paths");
      const { fetchFirstNonEmptySwallowingErrors } = await import("../rest-retry");
      (fetchFirstNonEmptySwallowingErrors as vi.Mock).mockResolvedValue([{ id: "1" }]);

      await fetchFiliais(mockConfig, "/custom/filiais", vi.fn());

      expect(buildCandidatePaths).toHaveBeenCalledWith("/custom/filiais", expect.any(Array));
    });
  });

  describe("fetchClientes", () => {
    it("retorna clientes deduplicados", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([
        { A1_COD: "001", A1_LOJA: "01", A1_NOME: "A" },
        { A1_COD: "001", A1_LOJA: "01", A1_NOME: "B" }, // duplicata
      ]);

      const result = await fetchClientes(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
      expect(result[0].A1_NOME).toBe("A");
    });

    it("usa fallback quando todas paths falham", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([{ A1_COD: "001", A1_LOJA: "01" }]);

      const result = await fetchClientes(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa customPath quando fornecido", async () => {
      const { buildCandidatePaths } = await import("../rest-paths");
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([{ A1_COD: "001", A1_LOJA: "01" }]);

      await fetchClientes(mockConfig, "/custom/clientes", vi.fn());

      expect(buildCandidatePaths).toHaveBeenCalledWith("/custom/clientes", expect.any(Array));
    });
  });

  describe("fetchFaturamentos", () => {
    it("retorna faturamentos deduplicados", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([
        { F2_DOC: "001", F2_SERIE: "1", F2_CLIENTE: "001", F2_LOJA: "01" },
        { F2_DOC: "001", F2_SERIE: "1", F2_CLIENTE: "001", F2_LOJA: "01" }, // duplicata
      ]);

      const result = await fetchFaturamentos(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa customPath quando fornecido", async () => {
      const { buildCandidatePaths } = await import("../rest-paths");
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([{ F2_DOC: "001", F2_SERIE: "1", F2_CLIENTE: "001", F2_LOJA: "01" }]);

      await fetchFaturamentos(mockConfig, "/custom/faturamentos", vi.fn());

      expect(buildCandidatePaths).toHaveBeenCalledWith("/custom/faturamentos", expect.any(Array));
    });
  });

  describe("fetchContasReceber", () => {
    it("retorna contas a receber deduplicadas", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([
        { E1_PREFIXO: "1", E1_NUM: "001", E1_PARCELA: "1", E1_CLIENTE: "001", E1_LOJA: "01" },
        { E1_PREFIXO: "1", E1_NUM: "001", E1_PARCELA: "1", E1_CLIENTE: "001", E1_LOJA: "01" }, // duplicata
      ]);

      const result = await fetchContasReceber(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa customPath quando fornecido", async () => {
      const { buildCandidatePaths } = await import("../rest-paths");
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([{ E1_PREFIXO: "1", E1_NUM: "001", E1_PARCELA: "1", E1_CLIENTE: "001", E1_LOJA: "01" }]);

      await fetchContasReceber(mockConfig, "/custom/contas-receber", vi.fn());

      expect(buildCandidatePaths).toHaveBeenCalledWith("/custom/contas-receber", expect.any(Array));
    });
  });

  describe("fetchBaixas", () => {
    it("retorna baixas deduplicadas", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([
        { E5_PREFIXO: "1", E5_NUM: "001", E5_PARCELA: "1", E5_CLIENTE: "001", E5_LOJA: "01", E5_SEQ: "1" },
        { E5_PREFIXO: "1", E5_NUM: "001", E5_PARCELA: "1", E5_CLIENTE: "001", E5_LOJA: "01", E5_SEQ: "1" }, // duplicata
      ]);

      const result = await fetchBaixas(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa fallback vazio quando todas paths falham", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([]);

      const result = await fetchBaixas(mockConfig, undefined, vi.fn());

      expect(result).toEqual([]);
    });
  });

  describe("fetchSaldosContabeis", () => {
    it("retorna saldos contábeis deduplicados", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([
        { CQ_FILIAL: "01", CQ_CONTA: "1000", CQ_MES: "01", CQ_ANO: "2024", CQ_DATA: "20240131" },
        { CQ_FILIAL: "01", CQ_CONTA: "1000", CQ_MES: "01", CQ_ANO: "2024", CQ_DATA: "20240131" }, // duplicata
      ]);

      const result = await fetchSaldosContabeis(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa fallback vazio quando todas paths falham", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as vi.Mock).mockResolvedValue([]);

      const result = await fetchSaldosContabeis(mockConfig, undefined, vi.fn());

      expect(result).toEqual([]);
    });
  });
});