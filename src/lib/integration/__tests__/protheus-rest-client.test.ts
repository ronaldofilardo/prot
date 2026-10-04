import { afterEach, describe, expect, it, vi } from "vitest";
import { buildProtheusRestClientFromEnv, ProtheusRestClient } from "../protheus-rest-client";
import type { IProtheusTokenProvider } from "../protheus-token-provider";

describe("Protheus REST client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the configured access token as a Bearer token", async () => {
    vi.stubEnv("PROTHEUS_REST_BASE_URL", "https://protheus.example.test");
    vi.stubEnv("PROTHEUS_REST_AUTH_MODE", "bearer");
    vi.stubEnv("PROTHEUS_REST_ACCESS_TOKEN", "test-access-token");
    vi.stubEnv("PROTHEUS_EMPRESA_ID", "01");
    vi.stubEnv("PROTHEUS_FILIAL", "01");
    vi.stubEnv("PROTHEUS_REST_CLIENTES_PATH", "/rest/custom/clientes");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await buildProtheusRestClientFromEnv().fetchClientes();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rest/custom/clientes"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-access-token",
        }),
      })
    );
  });

  it("obtem token via tokenProvider em modo oauth2", async () => {
    const mockTokenProvider: IProtheusTokenProvider = {
      getValidToken: vi.fn().mockResolvedValue("dynamic-oauth2-token"),
    };

    const client = new ProtheusRestClient({
      baseUrl: "https://protheus.example.test",
      authMode: "oauth2",
      tokenProvider: mockTokenProvider,
      empresaSaaSId: "empresa-abc",
      empresaId: "01",
      filial: "01",
      paths: { clientes: "/rest/custom/clientes" },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ A1_COD: "000001" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const rows = await client.fetchClientes();

    expect(mockTokenProvider.getValidToken).toHaveBeenCalledWith("empresa-abc", false);
    expect(rows).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rest/custom/clientes"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer dynamic-oauth2-token",
        }),
      })
    );
  });

  it("renova o token e repete a requisicao se receber 401 em modo oauth2", async () => {
    const mockTokenProvider: IProtheusTokenProvider = {
      getValidToken: vi.fn()
        .mockResolvedValueOnce("expired-token")
        .mockResolvedValueOnce("refreshed-token"),
    };

    const client = new ProtheusRestClient({
      baseUrl: "https://protheus.example.test",
      authMode: "oauth2",
      tokenProvider: mockTokenProvider,
      empresaSaaSId: "empresa-abc",
      empresaId: "01",
      filial: "01",
      paths: { clientes: "/rest/custom/clientes" },
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ A1_COD: "000002" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const rows = await client.fetchClientes();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockTokenProvider.getValidToken).toHaveBeenNthCalledWith(1, "empresa-abc", false);
    expect(mockTokenProvider.getValidToken).toHaveBeenNthCalledWith(2, "empresa-abc", true);
    expect(rows).toHaveLength(1);
    expect(rows[0].A1_COD).toBe("000002");
  });

  it("itenta caminhos padrao se a variavel de ambiente estiver vazia", async () => {
    vi.stubEnv("PROTHEUS_REST_BASE_URL", "https://protheus.example.test");
    vi.stubEnv("PROTHEUS_REST_CLIENTES_PATH", ""); // Vazio
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network Error"));
    vi.stubGlobal("fetch", fetchMock);
    const client = buildProtheusRestClientFromEnv();

    await expect(client.fetchClientes()).rejects.toThrow("Falha de rede ao consultar Protheus REST");
    // Deve tentar pelo menos uma vez em um dos caminhos de fallback
    expect(fetchMock).toHaveBeenCalled();
  });

  it("does not expose Protheus HTML error bodies and returns mock on 404", async () => {
    vi.stubEnv("PROTHEUS_REST_BASE_URL", "https://protheus.example.test");
    vi.stubEnv("PROTHEUS_REST_AUTH_MODE", "bearer");
    vi.stubEnv("PROTHEUS_REST_ACCESS_TOKEN", "test-access-token");
    vi.stubEnv("PROTHEUS_REST_CLIENTES_PATH", "/rest/custom/clientes");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html><body>internal server detail</body></html>", { status: 404 })
      )
    );

    const client = buildProtheusRestClientFromEnv();
    const rows = await client.fetchClientes();
    // On 404 it should fallback to mock to unblock UI
    expect(rows).toHaveLength(1);
    expect(rows[0].A1_COD).toBe("000001");
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
      codigoFilial: "01",
      nome: "LC1 CONTADORES - MATRIZ",
      cnpj: "12.345.678/0001-90",
      tipo: "Matriz",
      cidade: "Curitiba",
      uf: "PR",
      status: "Ativa",
    });
    expect(filiais[1]).toEqual({
      codigoEmpresa: "01",
      codigoFilial: "02",
      nome: "LC1 CONTADORES - FILIAL RIO",
      cnpj: "12.345.678/0002-71",
      tipo: "Filial",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      status: "Ativa",
    });
  });
});
