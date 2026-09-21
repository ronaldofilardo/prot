import { describe, it, expect, beforeEach } from "vitest";
import { useFilters } from "../useFilters";

const estadoInicial = useFilters.getState();

describe("useFilters — filtro de matriz/filiais", () => {
  beforeEach(() => {
    useFilters.setState(estadoInicial, true);
  });

  it("inicia sem matriz e sem filiais selecionadas", () => {
    const { matrizId, empresaIds } = useFilters.getState();
    expect(matrizId).toBeNull();
    expect(empresaIds).toEqual([]);
  });

  it("setMatriz define a matriz selecionada", () => {
    useFilters.getState().setMatriz("matriz-1");
    expect(useFilters.getState().matrizId).toBe("matriz-1");
  });

  it("setMatriz reseta as filiais previamente selecionadas", () => {
    useFilters.getState().setMatriz("matriz-1");
    useFilters.getState().setEmpresaIds(["f1", "f2"]);
    expect(useFilters.getState().empresaIds).toEqual(["f1", "f2"]);

    useFilters.getState().setMatriz("matriz-2");
    expect(useFilters.getState().empresaIds).toEqual([]);
    expect(useFilters.getState().matrizId).toBe("matriz-2");
  });

  it("setMatriz(null) limpa a matriz selecionada e as filiais", () => {
    useFilters.getState().setMatriz("matriz-1");
    useFilters.getState().setEmpresaIds(["f1"]);

    useFilters.getState().setMatriz(null);
    expect(useFilters.getState().matrizId).toBeNull();
    expect(useFilters.getState().empresaIds).toEqual([]);
  });

  it("setEmpresaIds substitui a lista de filiais selecionadas", () => {
    useFilters.getState().setMatriz("matriz-1");
    useFilters.getState().setEmpresaIds(["f1", "f2", "f3"]);
    expect(useFilters.getState().empresaIds).toEqual(["f1", "f2", "f3"]);

    useFilters.getState().setEmpresaIds(["f1"]);
    expect(useFilters.getState().empresaIds).toEqual(["f1"]);
  });

  it("limparFiltros também limpa matriz e filiais, além dos filtros antigos", () => {
    useFilters.getState().setCliente("Cliente X");
    useFilters.getState().setMatriz("matriz-1");
    useFilters.getState().setEmpresaIds(["f1", "f2"]);

    useFilters.getState().limparFiltros();

    const estado = useFilters.getState();
    expect(estado.cliente).toBe("");
    expect(estado.matrizId).toBeNull();
    expect(estado.empresaIds).toEqual([]);
  });

  it("não afeta os filtros de cliente/data ao mudar a matriz", () => {
    useFilters.getState().setCliente("Cliente X");
    useFilters.getState().setDataInicial("2026-01-01");

    useFilters.getState().setMatriz("matriz-1");

    const estado = useFilters.getState();
    expect(estado.cliente).toBe("Cliente X");
    expect(estado.dataInicial).toBe("2026-01-01");
  });
});
