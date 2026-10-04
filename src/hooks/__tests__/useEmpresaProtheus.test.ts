import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEmpresaProtheus } from "../useEmpresaProtheus";

const fetchMock = vi.fn();

const jsonCompleto = {
  success: true,
  empresaAtual: { id: "e1", nome: "Matriz Alfa", cnpj: "11.111.111/0001-11" },
  empresaProtheus: { nome: "Protheus SA", cnpj: "22.222.222/0001-22" },
  tokenInfo: {
    ativo: true,
    ambiente: "producao",
    usuario: "admin",
    expiraEm: "1h",
    tokenPreview: "abc123",
  },
  filiais: [{ codigoEmpresa: "01", codigoFilial: "01", nome: "Matriz", tipo: "Matriz" }],
};

async function montarComDadosIniciais(json: unknown = jsonCompleto) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => json });
  const utils = renderHook(() => useEmpresaProtheus());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  fetchMock.mockClear();
  return utils;
}

describe("useEmpresaProtheus — carga e sincronização", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("inicia com loading e estados vazios", () => {
    const { result } = renderHook(() => useEmpresaProtheus());

    expect(result.current.loading).toBe(true);
    expect(result.current.empresaAtual).toBeNull();
    expect(result.current.tokenInfo).toBeNull();
    expect(result.current.filiais).toEqual([]);
    expect(result.current.salvando).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("carga inicial preenche empresa, token e filiais", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => jsonCompleto });
    const { result } = renderHook(() => useEmpresaProtheus());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/protheus/empresa", { method: "GET" });
    expect(result.current.empresaAtual?.nome).toBe("Matriz Alfa");
    expect(result.current.empresaProtheus?.nome).toBe("Protheus SA");
    expect(result.current.tokenInfo?.ativo).toBe(true);
    expect(result.current.filiais).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it("buscarDadosProtheus com path customizado codifica a URL", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => jsonCompleto });
    const { result } = renderHook(() => useEmpresaProtheus());
    await act(async () => {
      await result.current.buscarDadosProtheus("/grupo beta");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/protheus/empresa?path=%2Fgrupo%20beta", { method: "GET" });
  });

  it("resposta parcial mantém os estados anteriores", async () => {
    const { result } = await montarComDadosIniciais({ success: true });

    expect(result.current.empresaAtual).toBeNull();
    expect(result.current.filiais).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("success=false expõe a mensagem de erro", async () => {
    const { result } = await montarComDadosIniciais({ success: false, error: "Sem credenciais" });

    expect(result.current.error).toBe("Sem credenciais");
  });

  it("falha de rede na carga expõe mensagem padrão", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useEmpresaProtheus());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.error).toBe("Falha de comunicacao com o servidor");
    expect(result.current.loading).toBe(false);
  });

  it("sincronizar sem empresaProtheus não chama a API", async () => {
    const { result } = await montarComDadosIniciais({ success: true });

    await act(async () => {
      await result.current.sincronizarComProtheus();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.salvando).toBe(false);
  });

  it("sincronizar com sucesso grava a empresa retornada", async () => {
    const { result } = await montarComDadosIniciais();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ empresa: { id: "e2", nome: "Salva", cnpj: "33.333.333/0001-33" } }),
    });

    await act(async () => {
      await result.current.sincronizarComProtheus();
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/protheus/empresa");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ nome: "Protheus SA", cnpj: "22.222.222/0001-22" });
    expect(result.current.empresaAtual?.nome).toBe("Salva");
    expect(result.current.success).toBe("Dados da empresa atualizados com sucesso no sistema!");
    expect(result.current.salvando).toBe(false);
  });

  it("sincronizar com erro do servidor usa a mensagem do json", async () => {
    const { result } = await montarComDadosIniciais();
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "CNPJ inválido" }) });

    await act(async () => {
      await result.current.sincronizarComProtheus();
    });

    expect(result.current.error).toBe("CNPJ inválido");
    expect(result.current.success).toBeNull();
    expect(result.current.salvando).toBe(false);
  });

  it("sincronizar sem mensagem no json usa o texto padrão", async () => {
    const { result } = await montarComDadosIniciais();
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    await act(async () => {
      await result.current.sincronizarComProtheus();
    });

    expect(result.current.error).toBe("Erro ao salvar dados");
  });

  it("falha de rede na sincronização expõe mensagem de falha", async () => {
    const { result } = await montarComDadosIniciais();
    fetchMock.mockRejectedValue(new Error("timeout"));

    await act(async () => {
      await result.current.sincronizarComProtheus();
    });

    expect(result.current.error).toBe("Falha ao salvar dados da empresa");
    expect(result.current.salvando).toBe(false);
  });
});
