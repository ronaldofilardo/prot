import { describe, it, expect, vi, beforeEach } from "vitest";
import { puxarDoProtheus, type PullSetters } from "../puxar-protheus-action";

describe("puxarDoProtheus — modo sequencial e lote", () => {
  let setters: PullSetters;
  let pullingState: boolean;
  let errorState: string | null;
  let resultsState: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    pullingState = false;
    errorState = null;
    resultsState = null;
    setters = {
      setPulling: vi.fn((v) => { pullingState = typeof v === "function" ? v(pullingState) : v; }),
      setPullError: vi.fn((v) => { errorState = typeof v === "function" ? v(errorState) : v; }),
      setPullResults: vi.fn((v) => { resultsState = typeof v === "function" ? v(resultsState) : v; }),
    };
  });

  it("modo sequencial percorre entidades e interrompe dependentes se Cliente falhar", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}"));
      if (body.entidade === "Cliente") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Protheus indisponível para Cliente" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          resultados: [{
            arquivo: body.entidade,
            entidade: body.entidade,
            registros: 1,
            sync: { entidade: body.entidade, processados: 1, criados: 1, atualizados: 0, erros: 0 },
          }],
        }),
      });
    });
    global.fetch = fetchMock;

    const onSuccess = vi.fn();
    await puxarDoProtheus(setters, onSuccess, "sequencial");

    const calls = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).entidade);
    // Cliente foi chamado
    expect(calls).toContain("Cliente");
    // Faturamento, ContaReceber e ItemVenda não foram chamados via rede pois dependem de Cliente
    expect(calls).not.toContain("Faturamento");
    expect(calls).not.toContain("ContaReceber");
    expect(calls).not.toContain("ItemVenda");
    // ContaPagar e SaldoContabil são independentes de Cliente e foram chamados
    expect(calls).toContain("ContaPagar");
    expect(calls).toContain("SaldoContabil");
    // Como ContaPagar teve sucesso, onSuccess é notificado
    expect(onSuccess).toHaveBeenCalled();
  });

  it("modo lote mantém chamada única a /api/protheus/pull", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, resultados: [{ entidade: "Cliente" }] }),
    });
    global.fetch = fetchMock;

    const onSuccess = vi.fn();
    await puxarDoProtheus(setters, onSuccess, "lote");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/protheus/pull", { method: "POST" });
    expect(onSuccess).toHaveBeenCalled();
  });
});
