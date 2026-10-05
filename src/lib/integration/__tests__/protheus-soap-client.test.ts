import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProtheusSoapClient, buildProtheusSoapClientFromEnv } from "../protheus-soap-client";
import { ProtheusClientError } from "../protheus-client";

const fetchMock = vi.fn();

const config = {
  wsdlEndpoint: "https://totvs.local/wsdl/service.apw",
  username: "u",
  password: "p",
  empresaId: "01",
  filial: "02",
};

const xmlOk = `<?xml version="1.0"?>
<soap:Envelope><soap:Body><ConsultaTabela>
  <SA1><A1_COD>000001</A1_COD><A1_LOJA>01</A1_LOJA><A1_NOME>ACME</A1_NOME></SA1>
  <SA1><A1_COD>000002</A1_COD><A1_LOJA>02</A1_LOJA><A1_NOME>OUTRA</A1_NOME></SA1>
</ConsultaTabela></soap:Envelope>`;

describe("ProtheusSoapClient", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchEmpresa e fetchFiliais retornam dados locais com fallback de filial", async () => {
    const cliente = new ProtheusSoapClient(config);
    const semFilial = new ProtheusSoapClient({ ...config, filial: "" });

    const empresa = await cliente.fetchEmpresa();
    expect(empresa).toEqual({
      nome: "Empresa Protheus 01",
      cnpj: "00.000.000/0001-00",
      codigoEmpresa: "01",
      codigoFilial: "02",
    });

    const filiais = await semFilial.fetchFiliais();
    expect(filiais[0].codigoFilial).toBe("01");
    expect(filiais[0].tipo).toBe("Matriz");
  });

  it("fetchClientes monta o envelope SOAP com autenticacao basica", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => xmlOk });
    const cliente = new ProtheusSoapClient(config);

    const linhas = await cliente.fetchClientes();

    expect(linhas).toEqual([
      { A1_COD: "000001", A1_LOJA: "01", A1_NOME: "ACME" },
      { A1_COD: "000002", A1_LOJA: "02", A1_NOME: "OUTRA" },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(config.wsdlEndpoint);
    expect(init.method).toBe("POST");
    expect(init.headers.SOAPAction).toBe("http://www.totvs.com.br/ConsultaTabela");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("u:p").toString("base64")}`);
    expect(init.body).toContain("<cEmpresa>01</cEmpresa>");
    expect(init.body).toContain("<cFilial>02</cFilial>");
    expect(init.body).toContain("<cTabela>SA1</cTabela>");
  });

  it("resposta HTTP invalida lanca erro com status e corpo", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => "erro interno" });

    await expect(new ProtheusSoapClient(config).fetchFaturamentos()).rejects.toThrow(
      /SOAP Protheus retornou 500 para SF2: erro interno/
    );
  });

  it("falha de rede lanca erro tipado de rede", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(new ProtheusSoapClient(config).fetchBaixas()).rejects.toThrow(
      ProtheusClientError
    );
    await expect(new ProtheusSoapClient(config).fetchBaixas()).rejects.toThrow(
      /Falha de rede ao chamar SOAP Protheus \(SE5\)/
    );
  });

  it("SOAP Fault na resposta lanca erro especifico", async () => {
    const fault = `<?xml version="1.0"?><soap:Fault><faultcode>soap:Client</faultcode><faultstring>bad wsdl</faultstring></soap:Fault>`;
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => fault });

    await expect(new ProtheusSoapClient(config).fetchContasReceber()).rejects.toThrow(
      /SOAP Fault retornado pelo Protheus/
    );
  });

  it("resposta sem linhas e sem fault retorna lista vazia", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "<ok/>" });

    const linhas = await new ProtheusSoapClient(config).fetchClientes();

    expect(linhas).toEqual([]);
  });
});

describe("buildProtheusSoapClientFromEnv", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    delete process.env.PROTHEUS_SOAP_ENDPOINT;
    delete process.env.PROTHEUS_SOAP_USER;
    delete process.env.PROTHEUS_SOAP_PASSWORD;
  });

  it("sem endpoint configurado lanca erro claro", () => {
    delete process.env.PROTHEUS_SOAP_ENDPOINT;

    expect(() => buildProtheusSoapClientFromEnv()).toThrow(
      /PROTHEUS_SOAP_ENDPOINT nao configurado/
    );
  });

  it("com endpoint monta o cliente a partir das variaveis", () => {
    process.env.PROTHEUS_SOAP_ENDPOINT = "https://soap.local/service.apw";
    process.env.PROTHEUS_SOAP_USER = "admin";

    const cliente = buildProtheusSoapClientFromEnv();

    expect(cliente).toBeInstanceOf(ProtheusSoapClient);
  });
});
