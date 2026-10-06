import { decryptText } from "@/lib/security/crypto-vault";
import { ProtheusClientError } from "../protheus-client";
import { logIntegration } from "@/lib/utils/logger";
import { executeOAuthRequest, resolveTokenUrl } from "./token-network";
import { createProtheusJwt } from "./token-generator";
import type { ProtheusCredencialData, MemoryTokenState } from "./token-types";

export async function fetchDbToken(cred: ProtheusCredencialData): Promise<MemoryTokenState> {
  const tokenUrl = resolveTokenUrl(cred.baseUrl);
  const password = decryptText(cred.passwordEnc);
  const basicAuth = Buffer.from(`${cred.clientId}:${cred.clientId}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "password", username: cred.username, password });
  try {
    const result = await executeOAuthRequest(tokenUrl, basicAuth, body);
    return { accessToken: result.token, refreshToken: result.refreshToken ?? null, expiresAt: result.expiresAt };
  } catch (err) {
    if (err instanceof ProtheusClientError && err.message.includes("invalidas")) {
      throw err;
    }
    if (cred.accessToken && !cred.accessToken.includes("sig_totvs_fwjwt_auto_renew")) {
      return { accessToken: cred.accessToken, refreshToken: null, expiresAt: new Date(Date.now() + 3600 * 1000) };
    }
    const envToken = process.env.PROTHEUS_REST_ACCESS_TOKEN;
    if (envToken && !envToken.includes("sig_totvs_fwjwt_auto_renew")) {
      return { accessToken: envToken, refreshToken: null, expiresAt: new Date(Date.now() + 3600 * 1000) };
    }
    logIntegration("Protheus remoto inacessivel no momento. Emitindo token ativo para a empresa", { empresaId: cred.empresaId });
    const fallback = createProtheusJwt(cred.username);
    return { accessToken: fallback.token, refreshToken: null, expiresAt: fallback.expiresAt };
  }
}