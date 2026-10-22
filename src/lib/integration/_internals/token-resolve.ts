import { isTokenExpired, parseJwtExpiry } from "./token-network";
import { getMemoryToken, setMemoryToken } from "./token-env-sync";
import { logIntegration } from "@/lib/utils/logger";
import type { ProtheusCredencialData, ProtheusCredencialDelegate, ProtheusCredencialStore, MemoryTokenState } from "./token-types";
import { fetchDbToken } from "./token-db-fetch";
import { isForgedProtheusToken } from "./token-generator";

export function isTokenValid(token: string | null | undefined, expiresAt: Date | null | undefined): boolean {
  if (!token) return false;
  if (isForgedProtheusToken(token)) return false;
  const jwtExpiry = parseJwtExpiry(token);
  if (jwtExpiry && isTokenExpired(jwtExpiry)) return false;
  return !isTokenExpired(expiresAt);
}

export function resolveCredencial(store: ProtheusCredencialStore, empresaId: string) {
  return store.protheusCredencial?.findUnique({ where: { empresaId } }).catch(() => null) ?? null;
}

export async function persistToken(
  credDelegate: ProtheusCredencialDelegate | undefined,
  empresaId: string,
  result: MemoryTokenState
): Promise<void> {
  if (credDelegate && !isForgedProtheusToken(result.accessToken)) {
    try {
      await credDelegate.update({
        where: { empresaId },
        data: { accessToken: result.accessToken!, expiresAt: result.expiresAt! },
      });
    } catch (err) {
      logIntegration("Falha ao persistir token Protheus no banco", {
        empresaId,
        erro: err instanceof Error ? err.message : String(err),
      });
    }
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
  await persistToken(credDelegate, empresaId, result);
  return result.accessToken!;
}

export async function resolveCachedOrEnvToken(empresaId: string, forceRefresh: boolean): Promise<string> {
  const mem = getMemoryToken();
  if (!forceRefresh && isTokenValid(mem.accessToken, mem.expiresAt)) {
    return mem.accessToken!;
  }

  const envToken = process.env.PROTHEUS_REST_ACCESS_TOKEN;
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