import { describe, it, expect } from "vitest";
import {
  listarUFs,
  filtrarFiliaisPorUF,
  todasSelecionadas,
  alternarFilial,
  alternarTodasFiliais,
  idsParaSelecionarAoEscolherMatriz,
} from "../filial-selection";
import type { EmpresaGrupoDTO, FilialFiltroDTO } from "@/lib/types/dashboard";

const filiais: FilialFiltroDTO[] = [
  { id: "f1", nome: "Filial 01", cidade: "Rio de Janeiro", uf: "RJ" },
  { id: "f2", nome: "Filial 02", cidade: "Curitiba", uf: "PR" },
  { id: "f3", nome: "Filial 03", cidade: "Rio de Janeiro", uf: "RJ" },
  { id: "f4", nome: "Filial 04", cidade: "Sao Paulo", uf: "SP" },
];

describe("listarUFs", () => {
  it("retorna as UFs únicas em ordem alfabética", () => {
    expect(listarUFs(filiais)).toEqual(["PR", "RJ", "SP"]);
  });

  it("retorna array vazio quando não há filiais", () => {
    expect(listarUFs([])).toEqual([]);
  });
});

describe("filtrarFiliaisPorUF", () => {
  it("retorna todas as filiais quando uf é string vazia", () => {
    expect(filtrarFiliaisPorUF(filiais, "")).toEqual(filiais);
  });

  it("retorna apenas as filiais da UF informada", () => {
    expect(filtrarFiliaisPorUF(filiais, "RJ")).toEqual([filiais[0], filiais[2]]);
  });

  it("retorna array vazio para UF sem filiais", () => {
    expect(filtrarFiliaisPorUF(filiais, "MG")).toEqual([]);
  });
});

describe("todasSelecionadas", () => {
  it("retorna false quando a lista de filiais está vazia", () => {
    expect(todasSelecionadas([], [])).toBe(false);
  });

  it("retorna false quando nenhuma filial está selecionada", () => {
    expect(todasSelecionadas(filiais, [])).toBe(false);
  });

  it("retorna false quando apenas parte das filiais está selecionada", () => {
    expect(todasSelecionadas(filiais, ["f1", "f2"])).toBe(false);
  });

  it("retorna true quando todas as filiais estão selecionadas", () => {
    expect(todasSelecionadas(filiais, ["f1", "f2", "f3", "f4"])).toBe(true);
  });

  it("retorna true mesmo com ids extras não pertencentes à lista", () => {
    expect(todasSelecionadas(filiais, ["f1", "f2", "f3", "f4", "extra"])).toBe(true);
  });
});

describe("alternarFilial", () => {
  it("adiciona a filial quando ainda não está selecionada", () => {
    expect(alternarFilial(["f1"], "f2")).toEqual(["f1", "f2"]);
  });

  it("remove a filial quando já está selecionada", () => {
    expect(alternarFilial(["f1", "f2"], "f1")).toEqual(["f2"]);
  });

  it("a partir de uma lista vazia, adiciona normalmente", () => {
    expect(alternarFilial([], "f1")).toEqual(["f1"]);
  });

  it("não modifica o array original (imutabilidade)", () => {
    const original = ["f1"];
    alternarFilial(original, "f2");
    expect(original).toEqual(["f1"]);
  });
});

describe("alternarTodasFiliais", () => {
  it("retorna os ids de todas as filiais quando marcarTodas é true", () => {
    expect(alternarTodasFiliais(filiais, true)).toEqual(["f1", "f2", "f3", "f4"]);
  });

  it("retorna array vazio quando marcarTodas é false", () => {
    expect(alternarTodasFiliais(filiais, false)).toEqual([]);
  });

  it("retorna array vazio para lista de filiais vazia, mesmo marcando todas", () => {
    expect(alternarTodasFiliais([], true)).toEqual([]);
  });
});

describe("idsParaSelecionarAoEscolherMatriz", () => {
  const grupos: EmpresaGrupoDTO[] = [
    {
      id: "matriz-1",
      nome: "Comercial Brasil",
      cnpj: "00.000.000/0001-00",
      filiais: [
        { id: "f1", nome: "Filial 01", cidade: "Rio de Janeiro", uf: "RJ" },
        { id: "f2", nome: "Filial 02", cidade: "Curitiba", uf: "PR" },
      ],
    },
    { id: "emp-avulsa", nome: "Empresa Avulsa", cnpj: "11.111.111/0001-00", filiais: [] },
  ];

  it("retorna array vazio para a opção 'Todas as empresas' (id vazio)", () => {
    expect(idsParaSelecionarAoEscolherMatriz(grupos, "")).toEqual([]);
  });

  it("matriz com filiais retorna ela mesma + todas as suas filiais", () => {
    expect(idsParaSelecionarAoEscolherMatriz(grupos, "matriz-1")).toEqual(["matriz-1", "f1", "f2"]);
  });

  it("empresa independente (sem filiais) retorna só ela mesma, não vazio", () => {
    expect(idsParaSelecionarAoEscolherMatriz(grupos, "emp-avulsa")).toEqual(["emp-avulsa"]);
  });

  it("id que não existe na lista de grupos ainda retorna esse id sozinho (fallback seguro)", () => {
    expect(idsParaSelecionarAoEscolherMatriz(grupos, "id-desconhecido")).toEqual(["id-desconhecido"]);
  });
});
