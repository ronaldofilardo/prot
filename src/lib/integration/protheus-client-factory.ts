import { ProtheusClient, ProtheusClientError } from "./protheus-client";
import { buildProtheusRestClientFromEnv } from "./protheus-rest-client";
import { buildProtheusSoapClientFromEnv } from "./protheus-soap-client";

/**
 * Ponto único de escolha do transporte de integração.
 *
 * PROTHEUS_INTEGRATION_MODE=rest (padrão) → WebServices REST nativos
 * PROTHEUS_INTEGRATION_MODE=soap          → WebServices SOAP (fallback)
 *
 * Conexão direta ao banco e middleware ODBC/JDBC foram descartados como
 * opção — ver docs/protheus-integracao-decisao.md.
 */
export function getProtheusClient(): ProtheusClient {
  const mode = (process.env.PROTHEUS_INTEGRATION_MODE || "rest").toLowerCase();

  if (mode === "rest") return buildProtheusRestClientFromEnv();
  if (mode === "soap") return buildProtheusSoapClientFromEnv();

  throw new ProtheusClientError(
    `PROTHEUS_INTEGRATION_MODE invalido: '${mode}' (valores aceitos: 'rest' ou 'soap')`
  );
}
