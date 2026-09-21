import { describe, it, expect } from "vitest";
import {
  isMatriz,
  resolveEmpresaGroupIds,
  whereEmpresaGrupo,
  resolveEmpresaIdsConsulta,
  resolveIdsPermitidosTotal,
  type EmpresaHierarquia,
} from "../empresa-grupo";

describe("isMatriz", () => {
  it("retorna true quando matrizId é null", () => {
    expect(isMatriz({ matrizId: null })).toBe(true);
  });

  it("retorna true quando matrizId é undefined", () => {
    expect(isMatriz({ matrizId: undefined as unknown as null })).toBe(true);
  });

  it("retorna false quando matrizId está preenchido", () => {
    expect(isMatriz({ matrizId: "emp-matriz" })).toBe(false);
  });
});

describe("resolveEmpresaGroupIds", () => {
  it("empresa sem matriz e sem filiais retorna apenas ela mesma", () => {
    const empresa: EmpresaHierarquia = { id: "emp-1", matrizId: null };
    expect(resolveEmpresaGroupIds(empresa)).toEqual(["emp-1"]);
  });

  it("matriz com filiais retorna matriz + todas as filiais", () => {
    const empresa: EmpresaHierarquia = {
      id: "emp-matriz",
      matrizId: null,
      filiais: [{ id: "emp-filial-1" }, { id: "emp-filial-2" }],
    };
    expect(resolveEmpresaGroupIds(empresa)).toEqual([
      "emp-matriz",
      "emp-filial-1",
      "emp-filial-2",
    ]);
  });

  it("matriz sem filiais carregadas retorna somente ela mesma", () => {
    const empresa: EmpresaHierarquia = { id: "emp-matriz", matrizId: null, filiais: [] };
    expect(resolveEmpresaGroupIds(empresa)).toEqual(["emp-matriz"]);
  });

  it("filial retorna a si mesma + a matriz, mesmo sem lista de irmãs", () => {
    const empresa: EmpresaHierarquia = {
      id: "emp-filial-1",
      matrizId: "emp-matriz",
    };
    expect(resolveEmpresaGroupIds(empresa)).toEqual(["emp-filial-1", "emp-matriz"]);
  });

  it("filial com matriz.filiais retorna a si mesma, a matriz e as irmãs, sem duplicar", () => {
    const empresa: EmpresaHierarquia = {
      id: "emp-filial-1",
      matrizId: "emp-matriz",
      matriz: {
        id: "emp-matriz",
        filiais: [{ id: "emp-filial-1" }, { id: "emp-filial-2" }, { id: "emp-filial-3" }],
      },
    };
    const ids = resolveEmpresaGroupIds(empresa);

    expect(ids).toContain("emp-filial-1");
    expect(ids).toContain("emp-filial-2");
    expect(ids).toContain("emp-filial-3");
    expect(ids).toContain("emp-matriz");
    expect(ids).toHaveLength(4);
  });

  it("nunca retorna ids duplicados mesmo se a própria empresa aparecer na lista de irmãs", () => {
    const empresa: EmpresaHierarquia = {
      id: "emp-filial-1",
      matrizId: "emp-matriz",
      matriz: {
        id: "emp-matriz",
        filiais: [{ id: "emp-filial-1" }],
      },
    };
    const ids = resolveEmpresaGroupIds(empresa);

    expect(ids.filter((id) => id === "emp-filial-1")).toHaveLength(1);
    expect(ids).toEqual(["emp-filial-1", "emp-matriz"]);
  });
});

describe("whereEmpresaGrupo", () => {
  it("monta o where do Prisma com o array de ids do grupo", () => {
    const empresa: EmpresaHierarquia = {
      id: "emp-matriz",
      matrizId: null,
      filiais: [{ id: "emp-filial-1" }],
    };

    expect(whereEmpresaGrupo(empresa)).toEqual({
      empresaId: { in: ["emp-matriz", "emp-filial-1"] },
    });
  });

  it("para empresa isolada, o where filtra só pelo próprio id", () => {
    const empresa: EmpresaHierarquia = { id: "emp-1", matrizId: null };
    expect(whereEmpresaGrupo(empresa)).toEqual({ empresaId: { in: ["emp-1"] } });
  });
});

describe("resolveEmpresaIdsConsulta", () => {
  it("sem nada solicitado, retorna todo o grupo permitido", () => {
    expect(resolveEmpresaIdsConsulta(["m1", "f1", "f2"], [])).toEqual(["m1", "f1", "f2"]);
  });

  it("com solicitação dentro do permitido, retorna só o solicitado", () => {
    expect(resolveEmpresaIdsConsulta(["m1", "f1", "f2"], ["f1"])).toEqual(["f1"]);
  });

  it("com solicitação parcialmente fora do permitido, ignora o id inválido", () => {
    expect(resolveEmpresaIdsConsulta(["m1", "f1", "f2"], ["f1", "empresa-de-outro-grupo"])).toEqual(["f1"]);
  });

  it("com solicitação totalmente fora do permitido, cai para o grupo inteiro", () => {
    expect(resolveEmpresaIdsConsulta(["m1", "f1", "f2"], ["empresa-de-outro-grupo"])).toEqual([
      "m1",
      "f1",
      "f2",
    ]);
  });

  it("preserva a ordem em que os ids foram solicitados, não a do permitido", () => {
    expect(resolveEmpresaIdsConsulta(["m1", "f1", "f2"], ["f2", "f1"])).toEqual(["f2", "f1"]);
  });
});

describe("resolveIdsPermitidosTotal", () => {
  it("retorna array vazio para lista vazia de hierarquias", () => {
    expect(resolveIdsPermitidosTotal([])).toEqual([]);
  });

  it("uma única empresa isolada retorna só ela mesma", () => {
    expect(resolveIdsPermitidosTotal([{ id: "emp-1", matrizId: null }])).toEqual(["emp-1"]);
  });

  it("junta várias empresas independentes (sem matriz/filial) num único conjunto", () => {
    const hierarquias: EmpresaHierarquia[] = [
      { id: "emp-1", matrizId: null },
      { id: "emp-2", matrizId: null },
      { id: "emp-3", matrizId: null },
    ];
    expect(resolveIdsPermitidosTotal(hierarquias)).toEqual(["emp-1", "emp-2", "emp-3"]);
  });

  it("combina uma empresa com filiais e empresas avulsas sem duplicar", () => {
    const hierarquias: EmpresaHierarquia[] = [
      { id: "matriz-1", matrizId: null, filiais: [{ id: "filial-1" }, { id: "filial-2" }] },
      { id: "emp-avulsa-1", matrizId: null },
      { id: "emp-avulsa-2", matrizId: null },
    ];
    expect(resolveIdsPermitidosTotal(hierarquias)).toEqual([
      "matriz-1",
      "filial-1",
      "filial-2",
      "emp-avulsa-1",
      "emp-avulsa-2",
    ]);
  });

  it("não duplica ids quando a mesma empresa aparece em mais de uma hierarquia", () => {
    const hierarquias: EmpresaHierarquia[] = [
      { id: "emp-1", matrizId: null },
      { id: "emp-1", matrizId: null },
    ];
    expect(resolveIdsPermitidosTotal(hierarquias)).toEqual(["emp-1"]);
  });
});
