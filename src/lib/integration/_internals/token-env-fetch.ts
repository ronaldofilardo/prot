import { ProtheusClientError } from "../protheus-client";
import { executeOAuthRequest, resolveTokenUrl } from "./token-network";
import { createProtheusJwt } from "./token-generator";
import { getMemoryToken } from "./token-env-sync";
import { logIntegration } from "@/lib/utils/logger";
import type { MemoryTokenState } from "./token-types";

async function tryRefreshToken(
  tokenUrl: string,
  basicAuth: string,
  refreshToken?: string | null
): Promise<MemoryTokenState | null> {
  if (!refreshToken) return null;
  try {
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
    const result = await executeOAuthRequest(tokenUrl, basicAuth, body);
    return { accessToken: result.token, refreshToken: result.refreshToken ?? null, expiresAt: result.expiresAt };
  } catch {
    return null;
  }
}

async function tryPasswordToken(
  tokenUrl: string,
  basicAuth: string,
  user: string,
  pass?: string
): Promise<MemoryTokenState | null> {
  if (!pass) return null;
  try {
    const body = new URLSearchParams({ grant_type: "password", username: user, password: pass });
    const result = await executeOAuthRequest(tokenUrl, basicAuth, body);
    return { accessToken: result.token, refreshToken: result.refreshToken ?? null, expiresAt: result.expiresAt };
  } catch (err) {
    if (err instanceof ProtheusClientError && err.message.includes("invalidas")) {
      throw err;
    }
    return null;
  }
}

export async function fetchTokenFromEnv(
  baseUrl: string,
  forceRefresh = false
): Promise<MemoryTokenState> {
  const tokenUrl = resolveTokenUrl(baseUrl);
  const user = process.env.PROTHEUS_REST_USER || "admin";
  const pass = process.env.PROTHEUS_REST_PASSWORD;
  const clientId = process.env.PROTHEUS_REST_CLIENT_ID || user;
  const basicAuth = Buffer.from(`${clientId}:${clientId}`).toString("base64");
  const mem = getMemoryToken();
  const refreshToken = mem.refreshToken || process.env.PROTHEUS_REST_REFRESH_TOKEN;

  const refreshed = await tryRefreshToken(tokenUrl, basicAuth, refreshToken);
  if (refreshed) return refreshed;

  const passToken = await tryPasswordToken(tokenUrl, basicAuth, user, pass);
  if (passToken) return passToken;

  if (!forceRefresh) {
    const existingToken = process.env.PROTHEUS_REST_ACCESS_TOKEN;
    if (existingToken && !existingToken.includes("sig_totvs_fwjwt_auto_renew")) {
      logIntegration("Protheus remoto inacessivel no momento. Mantendo token configurado existente", { baseUrl });
      return { accessToken: existingToken, refreshToken: null, expiresAt: new Date(Date.now() + 86400 * 1000) };
    }
  }

  logIntegration("Protheus remoto inacessivel no momento. Emitindo token ativo com credenciais de ambiente", { baseUrl });
  const fallback = createProtheusJwt(user);
  return { accessToken: fallback.token, refreshToken: null, expiresAt: fallback.expiresAt };
}