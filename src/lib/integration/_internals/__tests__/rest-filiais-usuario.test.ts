import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProtheusRow } from "../../protheus-client";
import { fetchFiliaisUsuario } from "../rest-filiais-usuario";
import type { ProtheusRestConfig } from "../rest-types";

const config: ProtheusRestConfig = {
  baseUrl: "https://protheus.test",
  authMode: "bearer",
  empresaId: "01",
  filial: "0101",
  paths: {},
};

const SM0: ProtheusRow[] = [
  { M0_CODIGO: "01", M0_CODFIL: "0101", M0_FILIAL: "MATRIZ", M0_NOMECOM: "LC1 CONTADORES LTDA", M0_CGC: "11222333000181", M0_CIDENT: "CURITIBA", M0_ESTENT: "PR" },
  { M0_CODIGO: "01", M0_CODFIL: "0102", M0_FILIAL: "FILIAL SP", M0_NOMECOM: "LC1 CONTADORES LTDA", M0_CGC: "11222333000262", M0_CIDENT: "SAO PAULO", M0_ESTENT: "SP" },
  { M0_CODIGO: "02", M0_CODFIL: "0201", M0_FILIAL: "OUTRA EMPRESA", M0_NOMECOM: "OUTRA LTDA", M0_CGC: "99888777000155", M0_CIDENT: "RIO", M0_ESTENT: "RJ" },
];

function criarGetRows(acesso: ProtheusRow[], usuarios: ProtheusRow[] = [{ USR_ID: "000001", USR_CODIGO: "ana" }]) {
  return vi.fn(async (path: string): Promise<ProtheusRow[]> => {
    if (path.includes("tables=SM0")) return SM0;
    if (path.includes("tables=SYS_USR_FILIAL")) return acesso;
    if (path.includes("tables=SYS_USR")) return usuarios;
    return [];
  });
}

describe("fetchFiliaisUsuario", () => {
  beforeEach(() => {
    vi.stubEnv("PROTHEUS_REST_FILIAIS_ACESSO_PATH", "");
    vi.stubEnv("PROTHEUS_REST_USUARIOS_PATH", "");
    vi.stubEnv("PROTHEUS_REST_SM0_PATH", "");
    vi.stubEnv("PROTHEUS_REST_SM0_FILTRADO_POR_USUARIO", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("restringe as filiais as que o usuario pode acessar", async () => {
    const getRows = criarGetRows([{ USR_ID: "000001", USR_GRUPEMP: "01", USR_FILIAL: "0102" }]);
    const r = await fetchFiliaisUsuario(config, "ANA", getRows);

    expect(r.restricaoAplicada).toBe(true);
    expect(r.filiais).toHaveLength(1);
    expect(r.filiais[0]).toMatchObject({ filialCompleta: "0102", nomeFilial: "FILIAL SP", cidade: "SAO PAULO", uf: "SP", cnpj: "11.222.333/0002-62" });
  });

  it("curingas @@ liberam todas as filiais e marcam a matriz pelo CNPJ 0001", async () => {
    const getRows = criarGetRows([{ USR_ID: "000001", USR_GRUPEMP: "@@", USR_FILIAL: "@@@@" }]);
    const r = await fetchFiliaisUsuario(config, "ana", getRows);

    expect(r.restricaoAplicada).toBe(true);
    expect(r.filiais).toHaveLength(3);
    expect(r.filiais.find((f) => f.filialCompleta === "0101")?.tipo).toBe("Matriz");
    expect(r.filiais.find((f) => f.filialCompleta === "0102")?.tipo).toBe("Filial");
  });

  it("sem acesso encontrado devolve a SM0 completa com aviso", async () => {
    const getRows = criarGetRows([]);
    const r = await fetchFiliaisUsuario(config, "ana", getRows);

    expect(r.restricaoAplicada).toBe(false);
    expect(r.filiais).toHaveLength(3);
    expect(r.aviso).toContain("Não foi possível restringir");
  });

  it("linha de acesso vazia nunca vira acesso total", async () => {
    const getRows = criarGetRows([{ USR_ID: "000001" }]);
    const r = await fetchFiliaisUsuario(config, "ana", getRows);

    expect(r.restricaoAplicada).toBe(false);
  });

  it("sem usuario identificado devolve a SM0 completa com aviso", async () => {
    const r = await fetchFiliaisUsuario(config, null, criarGetRows([]));

    expect(r.usuario).toBeNull();
    expect(r.restricaoAplicada).toBe(false);
    expect(r.aviso).toContain("Usuário Protheus não identificado");
  });

  it("quando nenhum endpoint de filiais responde, lista as tentativas no aviso", async () => {
    const getRows = vi.fn(async (path: string): Promise<ProtheusRow[]> => {
      if (path.includes("tables=SM0")) return [];
      throw new Error(`Endpoint REST nao encontrado (404) em ${path}`);
    });
    const r = await fetchFiliaisUsuario(config, "ana", getRows);

    expect(r.filiais).toEqual([]);
    expect(r.restricaoAplicada).toBe(false);
    expect(r.aviso).toContain("genericQuery(SM0): sem linhas");
    expect(r.aviso).toContain("branches: 404");
  });

  it("endpoint proprio marcado como filtrado por usuario dispensa a consulta de acessos", async () => {
    vi.stubEnv("PROTHEUS_REST_SM0_PATH", "/rest/lc1/filiais?login={usuario}");
    vi.stubEnv("PROTHEUS_REST_SM0_FILTRADO_POR_USUARIO", "true");
    const getRows = vi.fn(async (path: string): Promise<ProtheusRow[]> => (path.startsWith("/rest/lc1/filiais") ? [SM0[1]] : []));
    const r = await fetchFiliaisUsuario(config, "ana", getRows);

    expect(getRows).toHaveBeenCalledWith("/rest/lc1/filiais?login=ana");
    expect(getRows).toHaveBeenCalledTimes(1);
    expect(r.restricaoAplicada).toBe(true);
    expect(r.filiais).toHaveLength(1);
  });
});
