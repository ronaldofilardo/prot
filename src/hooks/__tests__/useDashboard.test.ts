import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDashboard } from "../useDashboard";
import { useFilters } from "@/hooks/useFilters";

const mocks = vi.hoisted(() => {
  const replace = vi.fn();
  const params: Record<string, string> = {};
  return {
    replace,
    params,
    router: { replace },
    searchParams: { get: (k: string) => params[k] ?? null },
    fetchMock: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.searchParams,
}));

const dadosCompletos = {
  totalClientes: 10,
  clientesAtivosFiltrados: 8,
  faturamentoTotal: 5000,
  valorVencido: 300,
  ticketMedio: 500,
  faturamentos: [],
  faturamentoMes: [],
  faturamentoCliente: [],
  regiaoParticipacao: [],
  projecao: [],
  clientes: [],
  grupos: [],
};

function respostaOk() {
  return { ok: true, statusText: "OK", json: async () => dadosCompletos };
}

const estadoInicial = useFilters.getState();

describe("useDashboard — carga e filtros do dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useFilters.setState(estadoInicial, true);
    for (const k of Object.keys(mocks.params)) delete mocks.params[k];
    mocks.replace.mockClear();
    mocks.fetchMock.mockReset();
    vi.stubGlobal("fetch", mocks.fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("inicia carregando, sem dados e sem erro", () => {
    const { result } = renderHook(() => useDashboard());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.temFiltroAtivo).toBe(false);
  });

  it("carregarDados sem filtros busca a rota e preenche os dados", async () => {
    mocks.fetchMock.mockResolvedValue(respostaOk());
    const { result } = renderHook(() => useDashboard());

    await act(async () => {
      await result.current.carregarDados();
    });

    expect(mocks.fetchMock).toHaveBeenCalledWith("/api/dashboard?");
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard");
    expect(result.current.data).toEqual(dadosCompletos);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("aplica parâmetros da URL e monta a query com matriz e filiais", async () => {
    mocks.params.cliente = "CLI1";
    mocks.params.inicial = "2026-01-01";
    mocks.params.final = "2026-01-31";
    mocks.fetchMock.mockResolvedValue(respostaOk());

    const { result } = renderHook(() => useDashboard());

    expect(result.current.temFiltroAtivo).toBe(true);
    expect(useFilters.getState().cliente).toBe("CLI1");

    act(() => {
      useFilters.getState().setMatriz("m1");
      useFilters.getState().setEmpresaIds(["e1", "e2"]);
    });
    await act(async () => {
      await result.current.carregarDados();
    });

    const query = "cliente=CLI1&inicial=2026-01-01&final=2026-01-31&matriz=m1&empresaId=e1&empresaId=e2";
    expect(mocks.fetchMock).toHaveBeenCalledWith(`/api/dashboard?${query}`);
    expect(mocks.replace).toHaveBeenCalledWith(`/dashboard?${query}`);
  });

  it("resposta não-OK vira erro de requisição", async () => {
    mocks.fetchMock.mockResolvedValue({ ok: false, statusText: "Internal Server Error", json: async () => ({}) });
    const { result } = renderHook(() => useDashboard());

    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.error).toBe("Erro na requisição: Internal Server Error");
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("rejeição com Error usa a mensagem original", async () => {
    mocks.fetchMock.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useDashboard());

    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.error).toBe("offline");
    expect(result.current.loading).toBe(false);
  });

  it("rejeição não-Error usa a mensagem padrão", async () => {
    mocks.fetchMock.mockRejectedValue("rede quebrou");
    const { result } = renderHook(() => useDashboard());

    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.error).toBe("Erro ao conectar com a API");
  });

  it("dispara a busca automática 350ms após a montagem", async () => {
    mocks.fetchMock.mockResolvedValue(respostaOk());
    renderHook(() => useDashboard());

    expect(mocks.fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });
});
