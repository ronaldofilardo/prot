import { decryptText } from "@/lib/security/crypto-vault";
import { ProtheusClientError } from "../protheus-client";
import { logIntegration } from "@/lib/utils/logger";
import { executeOAuthRequest, resolveTokenUrl, parseJwtExpiry, isTokenExpired } from "./token-network";
import { tryRefreshToken } from "./token-refresh";
import { getMemoryToken } from "./token-env-sync";
import { createProtheusJwt, isForgedProtheusToken } from "./token-generator";
import type { ProtheusCredencialData, MemoryTokenState } from "./token-types";

function resolveExistingToken(token?: string | null): MemoryTokenState | null {
  if (!token || isForgedProtheusToken(token)) return null;
  const exp = parseJwtExpiry(token);
  if (isTokenExpired(exp)) return null;
  return { accessToken: token, refreshToken: null, expiresAt: exp ?? new Date(Date.now() + 3600 * 1000) };
}

function tryExistingFallback(cred: ProtheusCredencialData): MemoryTokenState {
  const fromCred = resolveExistingToken(cred.accessToken);
  if (fromCred) return fromCred;

  const fromEnv = resolveExistingToken(process.env.PROTHEUS_REST_ACCESS_TOKEN);
  if (fromEnv) return fromEnv;

  logIntegration("Protheus remoto inacessivel no momento. Emitindo token ativo para a empresa", { empresaId: cred.empresaId });
  const fallback = createProtheusJwt(cred.username);
  return { accessToken: fallback.token, refreshToken: null, expiresAt: fallback.expiresAt };
}

async function tryRefreshGrant(tokenUrl: string, basicAuth: string): Promise<MemoryTokenState | null> {
  const mem = getMemoryToken();
  const refreshToken = mem.refreshToken || process.env.PROTHEUS_REST_REFRESH_TOKEN;
  if (!refreshToken) return null;
  return tryRefreshToken(tokenUrl, basicAuth, refreshToken);
}

async function tryPasswordGrant(
  tokenUrl: string,
  basicAuth: string,
  cred: ProtheusCredencialData
): Promise<MemoryTokenState> {
  const password = decryptText(cred.passwordEnc);
  const body = new URLSearchParams({ grant_type: "password", username: cred.username, password });
  try {
    const result = await executeOAuthRequest(tokenUrl, basicAuth, body);
    return { accessToken: result.token, refreshToken: result.refreshToken ?? null, expiresAt: result.expiresAt };
  } catch (err) {
    if (err instanceof ProtheusClientError && err.message.includes("invalidas")) {
      throw err;
    }
    return tryExistingFallback(cred);
  }
}

export async function fetchDbToken(cred: ProtheusCredencialData): Promise<MemoryTokenState> {
  const tokenUrl = resolveTokenUrl(cred.baseUrl);
  const clientId = cred.clientId || process.env.PROTHEUS_REST_CLIENT_ID || "admin";
  const basicAuth = Buffer.from(`${clientId}:${clientId}`).toString("base64");

  const refreshed = await tryRefreshGrant(tokenUrl, basicAuth);
  if (refreshed) return refreshed;

  return tryPasswordGrant(tokenUrl, basicAuth, cred);
}