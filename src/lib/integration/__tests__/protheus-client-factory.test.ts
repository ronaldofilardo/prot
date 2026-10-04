import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProtheusClient } from "../protheus-client-factory";
import { ProtheusRestClient } from "../protheus-rest-client";
import { ProtheusSoapClient } from "../protheus-soap-client";
import { ProtheusClientError } from "../protheus-client";

const { credencialFindUniqueMock } = vi.hoisted(() => ({
  credencialFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma-client", () => ({
  prisma: { protheusCredencial: { findUnique: credencialFindUniqueMock } },
}));

type ClientConfig = {
  baseUrl?: string;
  authMode?: string;
  empresaSaaSId?: string;
  wsdlEndpoint?: string;
};

function configOf(client: unknown): ClientConfig {
  return (client as { config: ClientConfig }).config;
}

const ENV_CHAVES = [
  "PROTHEUS_INTEGRATION_MODE",
  "PROTHEUS_REST_BASE_URL",
  "PROTHEUS_REST_AUTH_MODE",
  "PROTHEUS_SOAP_ENDPOINT",
] as const;

const envOriginal: Record<string, string | undefined> = {};

describe("getProtheusClient (protheus-client-factory.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const chave of ENV_CHAVES) envOriginal[chave] = process.env[chave];

    process.env.PROTHEUS_INTEGRATION_MODE = "rest";
    process.env.PROTHEUS_REST_BASE_URL = "https://rest.test";
    process.env.PROTHEUS_REST_AUTH_MODE = "basic";
    process.env.PROTHEUS_SOAP_ENDPOINT = "https://soap.test/wsdl";
    credencialFindUniqueMock.mockResolvedValue(null);
  });

  afterEach(() => {
    for (const chave of ENV_CHAVES) {
      if (envOriginal[chave] === undefined) delete process.env[chave];
      else process.env[chave] = envOriginal[chave];
    }
  });

  it("instancia REST em modo oauth2 com a credencial do banco da empresa", async () => {
    credencialFindUniqueMock.mockResolvedValue({ baseUrl: "https://cred.test" });

    const client = await getProtheusClient("emp-01");

    expect(client).toBeInstanceOf(ProtheusRestClient);
    expect(credencialFindUniqueMock).toHaveBeenCalledWith({ where: { empresaId: "emp-01" } });
    expect(configOf(client)).toMatchObject({
      baseUrl: "https://cred.test",
      authMode: "oauth2",
      empresaSaaSId: "emp-01",
    });
  });

  it("cai para as variáveis de ambiente quando não há credencial no banco", async () => {
    const client = await getProtheusClient("emp-01");

    expect(client).toBeInstanceOf(ProtheusRestClient);
    expect(configOf(client)).toMatchObject({
      baseUrl: "https://rest.test",
      authMode: "basic",
    });
    expect(configOf(client).empresaSaaSId).toBeUndefined();
  });

  it("cai para as variáveis de ambiente quando a consulta de credencial lança (tabela ausente)", async () => {
    credencialFindUniqueMock.mockRejectedValue(new Error(" tabela nao existe"));

    const client = await getProtheusClient("emp-01");

    expect(client).toBeInstanceOf(ProtheusRestClient);
    expect(configOf(client).baseUrl).toBe("https://rest.test");
  });

  it("não consulta o banco quando chamado sem empresaId", async () => {
    const client = await getProtheusClient();

    expect(credencialFindUniqueMock).not.toHaveBeenCalled();
    expect(client).toBeInstanceOf(ProtheusRestClient);
  });

  it("instancia o cliente SOAP quando PROTHEUS_INTEGRATION_MODE=soap", async () => {
    process.env.PROTHEUS_INTEGRATION_MODE = "soap";

    const client = await getProtheusClient();

    expect(client).toBeInstanceOf(ProtheusSoapClient);
    expect(configOf(client).wsdlEndpoint).toBe("https://soap.test/wsdl");
  });

  it("lança ProtheusClientError quando o modo de integração é inválido", async () => {
    process.env.PROTHEUS_INTEGRATION_MODE = "graphql";

    await expect(getProtheusClient()).rejects.toThrow(ProtheusClientError);
    await expect(getProtheusClient()).rejects.toThrow(/PROTHEUS_INTEGRATION_MODE invalido/);
  });

  it("lança ProtheusClientError quando falta a URL base do REST", async () => {
    delete process.env.PROTHEUS_REST_BASE_URL;

    await expect(getProtheusClient()).rejects.toThrow("PROTHEUS_REST_BASE_URL nao configurado");
  });
});
