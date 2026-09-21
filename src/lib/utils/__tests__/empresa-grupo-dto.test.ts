import { describe, it, expect } from "vitest";
import { buildGruposEmpresa, type EmpresaComFiliaisRow } from "../empresa-grupo-dto";

describe("buildGruposEmpresa", () => {
  it("retorna array vazio quando não há empresas", () => {
    expect(buildGruposEmpresa([])).toEqual([]);
  });

  it("inclui apenas empresas sem matriz (matrizId null) como grupos", () => {
    const empresas: EmpresaComFiliaisRow[] = [
      { id: "matriz-1", nome: "Matriz A", cnpj: "00.000.000/0001-00", matrizId: null, filiais: [] },
      { id: "filial-1", nome: "Filial isolada", cnpj: null, matrizId: "matriz-1", filiais: [] },
    ];

    const grupos = buildGruposEmpresa(empresas);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].id).toBe("matriz-1");
  });

  it("mapeia as filiais de uma matriz com nome e cnpj corretos", () => {
    const empresas: EmpresaComFiliaisRow[] = [
      {
        id: "matriz-1",
        nome: "Comercial Brasil LTDA",
        cnpj: "00.000.000/0001-00",
        matrizId: null,
        filiais: [
          { id: "f1", nome: "Filial 01", cnpj: "00.000.000/0002-00" },
          { id: "f2", nome: "Filial 02", cnpj: null },
        ],
      },
    ];

    const grupos = buildGruposEmpresa(empresas);

    expect(grupos[0].nome).toBe("Comercial Brasil LTDA");
    expect(grupos[0].cnpj).toBe("00.000.000/0001-00");
    expect(grupos[0].filiais).toEqual([
      { id: "f1", nome: "Filial 01", cidade: "", uf: "" },
      { id: "f2", nome: "Filial 02", cidade: "", uf: "" },
    ]);
  });

  it("preenche cidade/uf a partir do mapa cidadeUfPorFilialId quando informado", () => {
    const empresas: EmpresaComFiliaisRow[] = [
      {
        id: "matriz-1",
        nome: "Matriz A",
        cnpj: null,
        matrizId: null,
        filiais: [{ id: "f1", nome: "Filial 01", cnpj: null }],
      },
    ];

    const grupos = buildGruposEmpresa(empresas, {
      f1: { cidade: "Rio de Janeiro", uf: "RJ" },
    });

    expect(grupos[0].filiais[0]).toEqual({
      id: "f1",
      nome: "Filial 01",
      cidade: "Rio de Janeiro",
      uf: "RJ",
    });
  });

  it("usa string vazia para cidade/uf de filiais ausentes no mapa", () => {
    const empresas: EmpresaComFiliaisRow[] = [
      {
        id: "matriz-1",
        nome: "Matriz A",
        cnpj: null,
        matrizId: null,
        filiais: [{ id: "f1", nome: "Filial 01", cnpj: null }],
      },
    ];

    const grupos = buildGruposEmpresa(empresas, {});

    expect(grupos[0].filiais[0].cidade).toBe("");
    expect(grupos[0].filiais[0].uf).toBe("");
  });

  it("retorna múltiplas matrizes do mesmo tenant, cada uma com suas filiais", () => {
    const empresas: EmpresaComFiliaisRow[] = [
      {
        id: "matriz-1",
        nome: "Grupo A",
        cnpj: null,
        matrizId: null,
        filiais: [{ id: "f1", nome: "Filial 01", cnpj: null }],
      },
      {
        id: "matriz-2",
        nome: "Grupo B",
        cnpj: null,
        matrizId: null,
        filiais: [{ id: "f2", nome: "Filial 01", cnpj: null }],
      },
    ];

    const grupos = buildGruposEmpresa(empresas);

    expect(grupos.map((g) => g.id)).toEqual(["matriz-1", "matriz-2"]);
  });

  it("uma matriz sem filiais retorna filiais como array vazio", () => {
    const empresas: EmpresaComFiliaisRow[] = [
      { id: "matriz-1", nome: "Matriz sozinha", cnpj: null, matrizId: null, filiais: [] },
    ];

    expect(buildGruposEmpresa(empresas)[0].filiais).toEqual([]);
  });
});
