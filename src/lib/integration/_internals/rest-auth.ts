import { ProtheusClientError } from "../protheus-client";
import { protheusTokenProvider } from "../protheus-token-provider";
import { parseJwtExpiry, isTokenExpired } from "./token-network";
import type { ProtheusRestConfig } from "./rest-types";

function buildBasicAuth(config: ProtheusRestConfig): string {
  if (!config.username || !config.password) {
    throw new ProtheusClientError(
      "PROTHEUS_REST_USER/PROTHEUS_REST_PASSWORD nao configurados (authMode=basic)"
    );
  }
  const raw = `${config.username}:${config.password}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

async function buildBearerAuth(config: ProtheusRestConfig, forceRefresh: boolean): Promise<string> {
  if (!config.token) {
    throw new ProtheusClientError("PROTHEUS_REST_ACCESS_TOKEN nao configurado (authMode=bearer)");
  }
  if (!forceRefresh) {
    return `Bearer ${config.token}`;
  }

  const provider = config.tokenProvider ?? protheusTokenProvider;
  const targetEmpresaId = config.empresaSaaSId || config.empresaId;
  try {
    const token = await provider.getValidToken(targetEmpresaId, forceRefresh);
    if (token) return `Bearer ${token}`;
  } catch (err) {
    return `Bearer ${config.token}`;
  }
  return `Bearer ${config.token}`;
}

async function buildOAuth2Auth(config: ProtheusRestConfig, forceRefresh: boolean): Promise<string> {
  const provider = config.tokenProvider ?? protheusTokenProvider;
  const targetEmpresaId = config.empresaSaaSId || config.empresaId;
  const token = await provider.getValidToken(targetEmpresaId, forceRefresh);
  return `Bearer ${token}`;
}

export async function buildAuthHeader(
  config: ProtheusRestConfig,
  forceRefresh = false
): Promise<string> {
  if (config.authMode === "bearer") {
    return buildBearerAuth(config, forceRefresh);
  }

  if (config.authMode === "oauth2") {
    return buildOAuth2Auth(config, forceRefresh);
  }

  return buildBasicAuth(config);
}