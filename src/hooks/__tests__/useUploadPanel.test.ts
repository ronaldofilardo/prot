import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useUploadPanel } from "../useUploadPanel";

describe("useUploadPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize with default states", () => {
    const { result } = renderHook(() => useUploadPanel());
    expect(result.current.files).toEqual([]);
    expect(result.current.uploading).toBe(false);
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.pulling).toBe(false);
  });

  it("should add files when handleFileInput is called", () => {
    const { result } = renderHook(() => useUploadPanel());
    const file = new File(["foo"], "test.csv", { type: "text/csv" });
    const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    act(() => {
      result.current.handleFileInput(event);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe("test.csv");
  });

  it("should remove files when removeFile is called", () => {
    const { result } = renderHook(() => useUploadPanel());
    const file1 = new File(["1"], "1.csv", { type: "text/csv" });
    const file2 = new File(["2"], "2.csv", { type: "text/csv" });
    const event = { target: { files: [file1, file2] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    act(() => {
      result.current.handleFileInput(event);
    });
    
    act(() => {
      result.current.removeFile(0);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe("2.csv");
  });

  it("should perform handlePullFromProtheus successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ resultados: [{ entidade: "SA1", registros: 10, sync: { criados: 10, atualizados: 0, erros: 0 } }] })
    });

    const { result } = renderHook(() => useUploadPanel());
    
    await act(async () => {
      await result.current.handlePullFromProtheus();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/protheus/pull", { method: "POST" });
    expect(result.current.pullResults).toHaveLength(1);
    expect(result.current.pullError).toBeNull();
  });
});

const fetchMock = vi.fn();

function eventDrop(arquivos: File[]): React.DragEvent {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { files: arquivos },
  } as unknown as React.DragEvent;
}

describe("useUploadPanel — drop, upload e falhas", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("handleDrop adiciona apenas arquivos .csv", () => {
    const { result } = renderHook(() => useUploadPanel());
    const csv = new File(["a"], "a.csv");
    const txt = new File(["b"], "b.txt");

    act(() => {
      result.current.handleDrop(eventDrop([csv, txt]));
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe("a.csv");
  });

  it("pull com erro do servidor expõe a mensagem retornada", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Protheus offline" }) });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useUploadPanel(onSuccess));

    await act(async () => {
      await result.current.handlePullFromProtheus();
    });

    expect(result.current.pullError).toBe("Protheus offline");
    expect(result.current.pullResults).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.pulling).toBe(false);
  });

  it("pull sem mensagem no json usa o texto padrão", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { result } = renderHook(() => useUploadPanel());

    await act(async () => {
      await result.current.handlePullFromProtheus();
    });

    expect(result.current.pullError).toBe("Erro ao atualizar do Protheus");
  });

  it("pull com falha de rede expõe mensagem padrão", async () => {
    fetchMock.mockRejectedValue(new Error("reset"));
    const { result } = renderHook(() => useUploadPanel());

    await act(async () => {
      await result.current.handlePullFromProtheus();
    });

    expect(result.current.pullError).toBe("Falha ao conectar com o servidor");
    expect(result.current.pulling).toBe(false);
  });

  it("pull com sucesso notifica o callback de onSuccess", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, resultados: [{ entidade: "SA2", registros: 1, sync: {} }] }),
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useUploadPanel(onSuccess));

    await act(async () => {
      await result.current.handlePullFromProtheus();
    });

    expect(result.current.pullResults).toHaveLength(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("handleUpload sem arquivos não chama a API", async () => {
    const { result } = renderHook(() => useUploadPanel());

    await act(async () => {
      await result.current.handleUpload();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });

  it("handleUpload com sucesso envia os arquivos e limpa o estado", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ resultados: [{ entidade: "SA1", registros: 2, sync: {} }] }),
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useUploadPanel(onSuccess));
    const file = new File(["x"], "base.csv");
    act(() => {
      result.current.handleFileInput({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleUpload();
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/upload");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect(result.current.results).toHaveLength(1);
    expect(result.current.files).toEqual([]);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.uploading).toBe(false);
  });

  it("handleUpload com erro do servidor expõe a mensagem do json", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Formato inválido" }) });
    const { result } = renderHook(() => useUploadPanel());
    const file = new File(["x"], "base.csv");
    act(() => {
      result.current.handleFileInput({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleUpload();
    });

    expect(result.current.error).toBe("Formato inválido");
    expect(result.current.results).toBeNull();
    expect(result.current.uploading).toBe(false);
  });

  it("handleUpload sem mensagem no json usa o texto padrão", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { result } = renderHook(() => useUploadPanel());
    const file = new File(["x"], "base.csv");
    act(() => {
      result.current.handleFileInput({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleUpload();
    });

    expect(result.current.error).toBe("Erro no upload");
  });

  it("handleUpload com falha de rede expõe mensagem padrão", async () => {
    fetchMock.mockRejectedValue(new Error("reset"));
    const { result } = renderHook(() => useUploadPanel());
    const file = new File(["x"], "base.csv");
    act(() => {
      result.current.handleFileInput({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleUpload();
    });

    expect(result.current.error).toBe("Falha ao conectar com o servidor");
    expect(result.current.uploading).toBe(false);
  });
});
