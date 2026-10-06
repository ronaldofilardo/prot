import { isTokenExpired } from "./token-network";
import { getMemoryToken, setMemoryToken } from "./token-env-sync";
import { logIntegration } from "@/lib/utils/logger";
import type { ProtheusCredencialData, ProtheusCredencialDelegate, ProtheusCredencialStore, MemoryTokenState } from "./token-types";
import { fetchDbToken } from "./token-db-fetch";

export function isTokenValid(token: string | null | undefined, expiresAt: Date | null | undefined): boolean {
  return Boolean(token && !isTokenExpired(expiresAt));
}

export function resolveCredencial(store: ProtheusCredencialStore, empresaId: string) {
  return store.protheusCredencial?.findUnique({ where: { empresaId } }).catch(() => null) ?? null;
}

export function persistToken(credDelegate: ProtheusCredencialDelegate | undefined, empresaId: string, result: MemoryTokenState) {
  if (credDelegate) {
    credDelegate.update({ where: { empresaId }, data: { accessToken: result.accessToken!, expiresAt: result.expiresAt! } });
  }
  setMemoryToken(result.accessToken!, result.expiresAt!, result.refreshToken ?? undefined);
}

export async function resolveStoredCredencial(
  credDelegate: ProtheusCredencialDelegate | undefined,
  cred: ProtheusCredencialData,
  empresaId: string,
  forceRefresh: boolean
): Promise<string> {
  if (!forceRefresh && isTokenValid(cred.accessToken, cred.expiresAt)) {
    return cred.accessToken!;
  }
  logIntegration("Gerando/renovando token Protheus sob demanda", { empresaId, forceRefresh });
  const result = await fetchDbToken(cred);
  persistToken(credDelegate, empresaId, result);
  return result.accessToken!;
}

export async function resolveCachedOrEnvToken(empresaId: string, forceRefresh: boolean): Promise<string> {
  const mem = getMemoryToken();
  if (!forceRefresh && isTokenValid(mem.accessToken, mem.expiresAt)) {
    return mem.accessToken!;
  }

  const envToken = process.env.PROTHEUS_REST_ACCESS_TOKEN;
  const { parseJwtExpiry } = await import("./token-network");
  const envExpiry = envToken ? parseJwtExpiry(envToken) : null;
  if (!forceRefresh && envToken && isTokenValid(envToken, envExpiry)) {
    return envToken;
  }

  logIntegration("Gerando/renovando token Protheus sob demanda", { empresaId, forceRefresh });
  const baseUrl = process.env.PROTHEUS_REST_BASE_URL || "https://lc1contadores141403.protheus.cloudtotvs.com.br:1656/rest/index/TOKEN";
  const { fetchTokenFromEnv } = await import("./token-env-fetch");
  const result = await fetchTokenFromEnv(baseUrl, forceRefresh);
  setMemoryToken(result.accessToken!, result.expiresAt!, result.refreshToken ?? undefined);
  return result.accessToken!;
}