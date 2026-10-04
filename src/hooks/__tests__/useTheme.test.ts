import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTheme } from "../useTheme";

type Listener = (e: { matches: boolean }) => void;

function instalarMatchMedia(matchesInicial: boolean) {
  const listeners: Listener[] = [];
  let matches = matchesInicial;

  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return matches;
    },
    addEventListener: (_tipo: string, cb: Listener) => {
      listeners.push(cb);
    },
    removeEventListener: (_tipo: string, cb: Listener) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
    dispatchEvent: () => true,
  })) as unknown as typeof window.matchMedia;

  return {
    disparar(novoMatches: boolean) {
      matches = novoMatches;
      listeners.forEach((cb) => cb({ matches: novoMatches }));
    },
    quantidadeListeners: () => listeners.length,
  };
}

describe("useTheme — preferência de esquema escuro", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inicia escuro quando o sistema prefere dark e aplica a classe", () => {
    instalarMatchMedia(true);

    const { result } = renderHook(() => useTheme());

    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("inicia claro quando o sistema não prefere dark e remove a classe", () => {
    instalarMatchMedia(false);

    const { result } = renderHook(() => useTheme());

    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("reage a mudanças da media query atualizando estado e classe", () => {
    const midia = instalarMatchMedia(false);

    const { result, unmount } = renderHook(() => useTheme());
    expect(midia.quantidadeListeners()).toBe(1);

    act(() => midia.disparar(true));
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => midia.disparar(false));
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    unmount();
    expect(midia.quantidadeListeners()).toBe(0);
  });
});
