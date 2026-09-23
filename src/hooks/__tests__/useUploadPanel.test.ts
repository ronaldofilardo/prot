import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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
