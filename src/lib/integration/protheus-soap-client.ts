import { ProtheusClient, ProtheusClientError, ProtheusRow } from "./protheus-client";

/**
 * Cliente SOAP — WebServices nativos do Protheus (fallback).
 *
 * Usado quando o Protheus de destino é uma versão mais antiga (ou tem o
 * módulo REST desabilitado) e só expõe WebServices SOAP/WSDL — gratuitos,
 * porém em XML mais verboso e com estrutura que varia conforme a rotina
 * AdvPL publicada pelo cliente/consultoria TOTVS.
 *
 * Não usamos nenhuma lib SOAP externa (ex: `soap`, `strong-soap`) para
 * não adicionar uma dependência pesada só para isso — o envelope é
 * montado manualmente com `fetch()` e a resposta é lida com um parser
 * XML minimo e tolerante (suficiente para o retorno tabular típico
 * desses WebServices; não é um parser XML completo).
 *
 * *** AJUSTAR CONFORME O AMBIENTE — placeholders marcados com TODO ***
 * O nome da operação SOAP, o namespace e o formato exato do XML de
 * retorno dependem do WSDL publicado no Protheus de destino. Confirmar
 * com o time responsável antes de apontar para produção — ver
 * docs/protheus-integracao-decisao.md, Fase 0.
 *
 * Somente leitura: esta classe não expõe nenhum método de escrita.
 */

interface ProtheusSoapConfig {
  wsdlEndpoint: string; // ex: https://host:porta/wsdl/service.apw
  username: string;
  password: string;
  empresaId: string;
  filial: string;
}

// Nome do elemento raiz de cada "linha" no XML de resposta, por tabela.
// TODO: confirmar com o WSDL publicado (varia por rotina customizada).
const ROW_TAG: Record<string, string> = {
  SA1: "SA1",
  SF2: "SF2",
  SE1: "SE1",
  SE5: "SE5",
};

export class ProtheusSoapClient implements ProtheusClient {
  constructor(private readonly config: ProtheusSoapConfig) {}

  private buildEnvelope(tabela: string): string {
    // TODO: este envelope é um esqueleto genérico (padrão de rotina de
    // consulta AdvPL exposta via WSDATASET/WSMETHOD). Ajustar namespace,
    // nome da operação e parâmetros conforme o WSDL real do ambiente.
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ConsultaTabela xmlns="http://www.totvs.com.br/">
      <cEmpresa>${this.config.empresaId}</cEmpresa>
      <cFilial>${this.config.filial}</cFilial>
      <cTabela>${tabela}</cTabela>
    </ConsultaTabela>
  </soap:Body>
</soap:Envelope>`;
  }

  private async call(tabela: string): Promise<ProtheusRow[]> {
    const authRaw = `${this.config.username}:${this.config.password}`;
    let response: Response;
    try {
      response = await fetch(this.config.wsdlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          // TODO: confirmar a SOAPAction real esperada pelo WSDL do ambiente.
          SOAPAction: "http://www.totvs.com.br/ConsultaTabela",
          Authorization: `Basic ${Buffer.from(authRaw).toString("base64")}`,
        },
        body: this.buildEnvelope(tabela),
        cache: "no-store",
      });
    } catch (err) {
      throw new ProtheusClientError(`Falha de rede ao chamar SOAP Protheus (${tabela})`, err);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ProtheusClientError(
        `SOAP Protheus retornou ${response.status} para ${tabela}: ${body.slice(0, 300)}`
      );
    }

    const xml = await response.text();
    return this.parseRows(xml, ROW_TAG[tabela] || tabela);
  }

  /**
   * Parser XML mínimo e tolerante: extrai cada bloco <rowTag>...</rowTag>
   * e, dentro dele, cada <TAG>valor</TAG> como par chave/valor — o mesmo
   * shape de `Record<string, string>` que o CSV já produzia. Não trata
   * CDATA, namespaces com prefixo ou atributos. Se o XML real do
   * ambiente for mais complexo que isso, trocar por uma lib dedicada
   * (ex: `fast-xml-parser`) mantendo a mesma assinatura de retorno.
   */
  private parseRows(xml: string, rowTag: string): ProtheusRow[] {
    const rows: ProtheusRow[] = [];
    const rowRegex = new RegExp(`<${rowTag}>([\\s\\S]*?)<\\/${rowTag}>`, "g");
    const fieldRegex = /<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g;

    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRegex.exec(xml)) !== null) {
      const rowXml = rowMatch[1];
      const row: ProtheusRow = {};
      let fieldMatch: RegExpExecArray | null;
      fieldRegex.lastIndex = 0;
      while ((fieldMatch = fieldRegex.exec(rowXml)) !== null) {
        row[fieldMatch[1]] = fieldMatch[2].trim();
      }
      if (Object.keys(row).length > 0) rows.push(row);
    }

    if (rows.length === 0 && xml.includes("soap:Fault")) {
      throw new ProtheusClientError(`SOAP Fault retornado pelo Protheus: ${xml.slice(0, 300)}`);
    }

    return rows;
  }

  fetchClientes(): Promise<ProtheusRow[]> {
    return this.call("SA1");
  }
  fetchFaturamentos(): Promise<ProtheusRow[]> {
    return this.call("SF2");
  }
  fetchContasReceber(): Promise<ProtheusRow[]> {
    return this.call("SE1");
  }
  fetchBaixas(): Promise<ProtheusRow[]> {
    return this.call("SE5");
  }
}

export function buildProtheusSoapClientFromEnv(): ProtheusSoapClient {
  const wsdlEndpoint = process.env.PROTHEUS_SOAP_ENDPOINT;
  if (!wsdlEndpoint) {
    throw new ProtheusClientError("PROTHEUS_SOAP_ENDPOINT nao configurado");
  }
  return new ProtheusSoapClient({
    wsdlEndpoint,
    username: process.env.PROTHEUS_SOAP_USER || "",
    password: process.env.PROTHEUS_SOAP_PASSWORD || "",
    empresaId: process.env.PROTHEUS_EMPRESA_ID || "01",
    filial: process.env.PROTHEUS_FILIAL || "01",
  });
}
