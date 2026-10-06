import { afterEach, describe, expect, it, vi } from "vitest";
import { buildProtheusRestClientFromEnv } from "../protheus-rest-client";

describe("Protheus REST client — empresa e filiais", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("busca e normaliza os dados da empresa (nome e cnpj) no Protheus", async () => {
    vi.stubEnv("PROTHEUS_REST_BASE_URL", "https://protheus.example.test");
    vi.stubEnv("PROTHEUS_REST_AUTH_MODE", "bearer");
    vi.stubEnv("PROTHEUS_REST_ACCESS_TOKEN", "test-access-token");
    vi.stubEnv("PROTHEUS_REST_EMPRESA_PATH", "/rest/api/framework/v1/companies");
    vi.stubEnv("PROTHEUS_EMPRESA_ID", "01");
    vi.stubEnv("PROTHEUS_FILIAL", "01");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            companyId: "01",
            branchId: "01",
            name: "LC1 CONTADORES ASSOCIADOS LTDA",
            cgc: "12.345.678/0001-90",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = buildProtheusRestClientFromEnv();
    const dadosEmpresa = await client.fetchEmpresa();

    expect(dadosEmpresa).toEqual({
      nome: "LC1 CONTADORES ASSOCIADOS LTDA",
      cnpj: "12.345.678/0001-90",
      codigoEmpresa: "01",
      codigoFilial: "01",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rest/api/framework/v1/companies"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-access-token",
        }),
      })
    );
  });

  it("busca e mapeia a lista de filiais da empresa no Protheus", async () => {
    vi.stubEnv("PROTHEUS_REST_BASE_URL", "https://protheus.example.test");
    vi.stubEnv("PROTHEUS_REST_AUTH_MODE", "bearer");
    vi.stubEnv("PROTHEUS_REST_ACCESS_TOKEN", "test-access-token");
    vi.stubEnv("PROTHEUS_REST_FILIAIS_PATH", "/rest/api/framework/v1/branches");
    vi.stubEnv("PROTHEUS_EMPRESA_ID", "01");
    vi.stubEnv("PROTHEUS_FILIAL", "01");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            companyId: "01",
            branchId: "01",
            name: "LC1 CONTADORES - MATRIZ",
            cgc: "12.345.678/0001-90",
            city: "Curitiba",
            state: "PR",
          },
          {
            companyId: "01",
            branchId: "02",
            name: "LC1 CONTADORES - FILIAL RIO",
            cgc: "12.345.678/0002-71",
            city: "Rio de Janeiro",
            state: "RJ",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = buildProtheusRestClientFromEnv();
    const filiais = await client.fetchFiliais();

    expect(filiais).toHaveLength(2);
    expect(filiais[0]).toEqual({
      codigoEmpresa: "01",
      codigoUnidade: "01",
      codigoFilial: "01",
      filialCompleta: "01",
      nome: "LC1 CONTADORES - MATRIZ",
      cnpj: "12.345.678/0001-90",
      tipo: "Matriz",
      cidade: "Curitiba",
      uf: "PR",
      status: "Ativa",
    });
    expect(filiais[1]).toEqual({
      codigoEmpresa: "01",
      codigoUnidade: "01",
      codigoFilial: "02",
      filialCompleta: "02",
      nome: "LC1 CONTADORES - FILIAL RIO",
      cnpj: "12.345.678/0002-71",
      tipo: "Filial",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      status: "Ativa",
    });
  });

  it("busca lista de registros de SA1 com A1_COD, A1_NOME, A1_FILIAL, A1_CGC mantendo todos os registros", async () => {
    vi.stubEnv("PROTHEUS_REST_BASE_URL", "https://protheus.example.test");
    vi.stubEnv("PROTHEUS_REST_AUTH_MODE", "bearer");
    vi.stubEnv("PROTHEUS_REST_ACCESS_TOKEN", "test-token");
    vi.stubEnv(
      "PROTHEUS_REST_FILIAIS_PATH",
      "/rest/api/framework/v1/genericQuery?tables=SA1&fields=A1_COD,A1_NOME,A1_FILIAL,A1_CGC"
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              a1_filial: "00101001",
              a1_cod: "000099",
              a1_nome: "A J BOBATO",
              a1_cgc: "07493739000202",
            },
            {
              a1_filial: "00101001",
              a1_cod: "000192",
              a1_nome: "AGUAS CLARAS INVESTIMENTOS LTDA.",
              a1_cgc: "19668551000156",
            },
            {
              a1_filial: "00101001",
              a1_cod: "000028",
              a1_nome: "ALENCAR E MACHADO LTDA",
              a1_cgc: "24310087000161",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = buildProtheusRestClientFromEnv();
    const filiais = await client.fetchFiliais();

    expect(filiais).toHaveLength(3);
    expect(filiais[0].nome).toBe("A J BOBATO");
    expect(filiais[0].cnpj).toBe("07.493.739/0002-02");
    expect(filiais[0].codigoEmpresa).toBe("001");
    expect(filiais[0].codigoUnidade).toBe("01");
    expect(filiais[0].codigoFilial).toBe("001");
    expect(filiais[0].filialCompleta).toBe("00101001");
    expect(filiais[0].id).toBe("000099");

    expect(filiais[1].nome).toBe("AGUAS CLARAS INVESTIMENTOS LTDA.");
    expect(filiais[1].cnpj).toBe("19.668.551/0001-56");
    expect(filiais[1].id).toBe("000192");

    expect(filiais[2].nome).toBe("ALENCAR E MACHADO LTDA");
    expect(filiais[2].cnpj).toBe("24.310.087/0001-61");
    expect(filiais[2].id).toBe("000028");
  });
});
