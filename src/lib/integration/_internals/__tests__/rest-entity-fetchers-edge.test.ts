import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFaturamentos, fetchContasReceber, fetchBaixas, fetchSaldosContabeis } from "../rest-entity-fetchers";
import { mockConfig } from "./rest-entity-fetchers-test-utils";

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
    id: "filial-dup",
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

describe("rest-entity-fetchers.ts — edge cases", () => {
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

  describe("fetchFaturamentos", () => {
    it("retorna faturamentos deduplicados", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as ReturnType<typeof vi.fn>).mockResolvedValue([
        { F2_DOC: "001", F2_SERIE: "1", F2_CLIENTE: "001", F2_LOJA: "01" },
        { F2_DOC: "001", F2_SERIE: "1", F2_CLIENTE: "001", F2_LOJA: "01" },
      ]);

      const result = await fetchFaturamentos(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa customPath quando fornecido", async () => {
      const { buildCandidatePaths } = await import("../rest-paths");
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as ReturnType<typeof vi.fn>).mockResolvedValue([{ F2_DOC: "001", F2_SERIE: "1", F2_CLIENTE: "001", F2_LOJA: "01" }]);

      await fetchFaturamentos(mockConfig, "/custom/faturamentos", vi.fn());

      expect(buildCandidatePaths).toHaveBeenCalledWith("/custom/faturamentos", expect.any(Array));
    });
  });

  describe("fetchContasReceber", () => {
    it("retorna contas a receber deduplicadas", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as ReturnType<typeof vi.fn>).mockResolvedValue([
        { E1_PREFIXO: "1", E1_NUM: "001", E1_PARCELA: "1", E1_CLIENTE: "001", E1_LOJA: "01" },
        { E1_PREFIXO: "1", E1_NUM: "001", E1_PARCELA: "1", E1_CLIENTE: "001", E1_LOJA: "01" },
      ]);

      const result = await fetchContasReceber(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa customPath quando fornecido", async () => {
      const { buildCandidatePaths } = await import("../rest-paths");
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as ReturnType<typeof vi.fn>).mockResolvedValue([{ E1_PREFIXO: "1", E1_NUM: "001", E1_PARCELA: "1", E1_CLIENTE: "001", E1_LOJA: "01" }]);

      await fetchContasReceber(mockConfig, "/custom/contas-receber", vi.fn());

      expect(buildCandidatePaths).toHaveBeenCalledWith("/custom/contas-receber", expect.any(Array));
    });
  });

  describe("fetchBaixas", () => {
    it("retorna baixas deduplicadas", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as ReturnType<typeof vi.fn>).mockResolvedValue([
        { E5_PREFIXO: "1", E5_NUM: "001", E5_PARCELA: "1", E5_CLIENTE: "001", E5_LOJA: "01", E5_SEQ: "1" },
        { E5_PREFIXO: "1", E5_NUM: "001", E5_PARCELA: "1", E5_CLIENTE: "001", E5_LOJA: "01", E5_SEQ: "1" },
      ]);

      const result = await fetchBaixas(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa fallback vazio quando todas paths falham", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await fetchBaixas(mockConfig, undefined, vi.fn());

      expect(result).toEqual([]);
    });
  });

  describe("fetchSaldosContabeis", () => {
    it("retorna saldos contábeis deduplicados", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as ReturnType<typeof vi.fn>).mockResolvedValue([
        { CQ_FILIAL: "01", CQ_CONTA: "1000", CQ_MES: "01", CQ_ANO: "2024", CQ_DATA: "20240131" },
        { CQ_FILIAL: "01", CQ_CONTA: "1000", CQ_MES: "01", CQ_ANO: "2024", CQ_DATA: "20240131" },
      ]);

      const result = await fetchSaldosContabeis(mockConfig, undefined, vi.fn());

      expect(result).toHaveLength(1);
    });

    it("usa fallback vazio quando todas paths falham", async () => {
      const { fetchRowsFromFirstPath } = await import("../rest-retry");
      (fetchRowsFromFirstPath as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await fetchSaldosContabeis(mockConfig, undefined, vi.fn());

      expect(result).toEqual([]);
    });
  });
});
