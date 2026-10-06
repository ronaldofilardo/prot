import { ProtheusClientError } from "../protheus-client";
import { ProtheusRestClient } from "../protheus-rest-client";
import type { ProtheusRestConfig } from "./rest-types";

export function buildProtheusRestClientFromEnv(): ProtheusRestClient {
  const baseUrl = process.env.PROTHEUS_REST_BASE_URL;
  if (!baseUrl) {
    throw new ProtheusClientError("PROTHEUS_REST_BASE_URL nao configurado");
  }
  const authMode = (process.env.PROTHEUS_REST_AUTH_MODE as "bearer" | "basic" | "oauth2") || "basic";

  return new ProtheusRestClient({
    baseUrl,
    authMode,
    username: process.env.PROTHEUS_REST_USER,
    password: process.env.PROTHEUS_REST_PASSWORD,
    token: process.env.PROTHEUS_REST_ACCESS_TOKEN || process.env.PROTHEUS_REST_TOKEN,
    empresaId: process.env.PROTHEUS_EMPRESA_ID || "001",
    filial: process.env.PROTHEUS_FILIAL || "00101001",
    paths: {
      empresa: process.env.PROTHEUS_REST_EMPRESA_PATH,
      clientes: process.env.PROTHEUS_REST_CLIENTES_PATH,
      faturamentos: process.env.PROTHEUS_REST_FATURAMENTOS_PATH,
      contasReceber: process.env.PROTHEUS_REST_CONTAS_RECEBER_PATH,
      baixas: process.env.PROTHEUS_REST_BAIXAS_PATH,
      saldosContabeis: process.env.PROTHEUS_REST_SALDOS_CONTABEIS_PATH,
    },
  });
}

export function createProtheusRestClient(config: ProtheusRestConfig): ProtheusRestClient {
  return new ProtheusRestClient(config);
}