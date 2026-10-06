import { ProtheusClientError } from "../protheus-client";
import { logIntegration } from "@/lib/utils/logger";

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export function resolveTokenUrl(baseUrl: string): string {
  const clean = baseUrl.replace(/\/+$/, "");
  return clean.endsWith("/rest") ? `${clean}/api/oauth2/v1/token` : `${clean}/rest/api/oauth2/v1/token`;
}

export function parseJwtExpiry(token: string): Date | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    return payload?.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(expiresAt: Date | null | undefined, marginSec = 60): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() <= marginSec * 1000;
}

function buildTokenRequest(tokenUrl: string, basicAuth: string, body: URLSearchParams) {
  return fetch(tokenUrl, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
}

function handleTokenError(res: Response) {
  logIntegration("Falha na requisicao de token Protheus", { status: res.status });
  if (res.status === 400 || res.status === 401) {
    throw new ProtheusClientError("Credenciais Protheus invalidas ou nao autorizadas");
  }
  throw new ProtheusClientError(`Servico de autenticacao do Protheus retornou status ${res.status}`);
}

function parseTokenResponse(data: OAuthTokenResponse) {
  if (!data.access_token) {
    throw new ProtheusClientError("Resposta de token invalida do Protheus (access_token ausente)");
  }
  const durationSec = Number(data.expires_in) || 3600;
  return { token: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + durationSec * 1000) };
}

export async function executeOAuthRequest(
  tokenUrl: string,
  basicAuth: string,
  body: URLSearchParams
): Promise<{ token: string; refreshToken?: string; expiresAt: Date }> {
  try {
    const res = await buildTokenRequest(tokenUrl, basicAuth, body);
    if (!res.ok) handleTokenError(res);
    return parseTokenResponse((await res.json()) as OAuthTokenResponse);
  } catch (err) {
    if (err instanceof ProtheusClientError) throw err;
    throw new ProtheusClientError("Falha de rede ao conectar com servico de autenticacao do Protheus", err);
  }
}