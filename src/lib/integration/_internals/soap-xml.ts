import { ProtheusClientError, type ProtheusRow } from "../protheus-client";

// Nome do elemento raiz de cada "linha" no XML de resposta, por tabela.
// TODO: confirmar com o WSDL publicado (varia por rotina customizada).
export const ROW_TAG: Record<string, string> = {
  SA1: "SA1",
  SF2: "SF2",
  SE1: "SE1",
  SE5: "SE5",
};

type EnvelopeParams = { empresaId: string; filial: string };

// TODO: este envelope é um esqueleto genérico (padrão de rotina de
// consulta AdvPL exposta via WSDATASET/WSMETHOD). Ajustar namespace,
// nome da operação e parâmetros conforme o WSDL real do ambiente.
export function buildConsultaEnvelope(tabela: string, params: EnvelopeParams): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ConsultaTabela xmlns="http://www.totvs.com.br/">
      <cEmpresa>${params.empresaId}</cEmpresa>
      <cFilial>${params.filial}</cFilial>
      <cTabela>${tabela}</cTabela>
    </ConsultaTabela>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Parser XML mínimo e tolerante: extrai cada bloco <rowTag>...</rowTag>
 * e, dentro dele, cada <TAG>valor</TAG> como par chave/valor — o mesmo
 * shape de `Record<string, string>` que o CSV já produzia. Não trata
 * CDATA, namespaces com prefixo ou atributos. Se o XML real do
 * ambiente for mais complexo que isso, trocar por uma lib dedicada
 * (ex: `fast-xml-parser`) mantendo a mesma assinatura de retorno.
 */
export function parseSoapRows(xml: string, rowTag: string): ProtheusRow[] {
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
