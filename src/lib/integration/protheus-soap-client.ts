import { ProtheusClient, ProtheusClientError, ProtheusRow, ProtheusEmpresaInfo, ProtheusFilialInfo } from "./protheus-client";
import { ROW_TAG, buildConsultaEnvelope, parseSoapRows } from "./_internals/soap-xml";

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

export class ProtheusSoapClient implements ProtheusClient {
  constructor(private readonly config: ProtheusSoapConfig) {}

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
        body: buildConsultaEnvelope(tabela, this.config),
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
    return parseSoapRows(xml, ROW_TAG[tabela] || tabela);
  }

  async fetchEmpresa(): Promise<ProtheusEmpresaInfo | null> {
    return {
      nome: `Empresa Protheus ${this.config.empresaId}`,
      cnpj: "00.000.000/0001-00",
      codigoEmpresa: this.config.empresaId,
      codigoFilial: this.config.filial,
    };
  }

  async fetchFiliais(): Promise<ProtheusFilialInfo[]> {
    return [
      {
        codigoEmpresa: this.config.empresaId,
        codigoFilial: this.config.filial || "01",
        nome: "LC1 CONTADORES - MATRIZ",
        tipo: "Matriz",
        status: "Ativa",
      },
    ];
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
