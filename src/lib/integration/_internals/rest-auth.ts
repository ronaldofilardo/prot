import { ProtheusClientError } from "../protheus-client";
import { protheusTokenProvider } from "../protheus-token-provider";
import type { ProtheusRestConfig } from "./rest-types";

export async function buildAuthHeader(
  config: ProtheusRestConfig,
  forceRefresh = false
): Promise<string> {
  if (config.authMode === "oauth2") {
    const provider = config.tokenProvider ?? protheusTokenProvider;
    const targetEmpresaId = config.empresaSaaSId || config.empresaId;
    const token = await provider.getValidToken(targetEmpresaId, forceRefresh);
    return `Bearer ${token}`;
  }
  if (config.authMode === "bearer") {
    if (!config.token) {
      throw new ProtheusClientError(
        "PROTHEUS_REST_ACCESS_TOKEN nao configurado (authMode=bearer)"
      );
    }
    return `Bearer ${config.token}`;
  }
  if (!config.username || !config.password) {
    throw new ProtheusClientError(
      "PROTHEUS_REST_USER/PROTHEUS_REST_PASSWORD nao configurados (authMode=basic)"
    );
  }
  const raw = `${config.username}:${config.password}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}
