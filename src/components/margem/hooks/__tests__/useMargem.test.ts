import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMargem, buildMargemQueryString } from "../useMargem";

describe("useMargem hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("monta query string com filtros fornecidos", () => {
    const qs = buildMargemQueryString({
      filial: "01",
      clienteId: "cli-1",
      dataInicio: "2026-01-01",
      empresaIds: ["emp-1", "emp-2"],
    });

    expect(qs).toContain("filial=01");
    expect(qs).toContain("clienteId=cli-1");
    expect(qs).toContain("dataInicio=2026-01-01");
    expect(qs).toContain("empresaId=emp-1");
    expect(qs).toContain("empresaId=emp-2");
  });

  it("carrega dados com sucesso da API /api/margem", async () => {
    const mockData = {
      kpis: {
        receitaTotal: 1000,
        custoTotal: 600,
        margemBrutaValor: 400,
        margemBrutaPercentual: 40,
        receitaComCustoApurado: 1000,
        coberturaCustoPercentual: 100,
        quantidadeItens: 5,
      },
      porCliente: [],
      evolucaoTemporal: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useMargem());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("trata erro quando a API falha", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useMargem());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain("500");
    expect(result.current.data).toBeNull();
  });
});
