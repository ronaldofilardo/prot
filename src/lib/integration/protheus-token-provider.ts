import { prisma } from "@/lib/db/prisma-client";
import { decryptText } from "@/lib/security/crypto-vault";
import { ProtheusClientError } from "./protheus-client";
import { logIntegration, logApiError } from "@/lib/utils/logger";
import {
  executeOAuthRequest,
  resolveTokenUrl,
  parseJwtExpiry,
  isTokenExpired,
} from "./_internals/token-network";
import { createProtheusJwt } from "./_internals/token-generator";
import { getMemoryToken, setMemoryToken } from "./_internals/token-env-sync";

export type {
  IProtheusTokenProvider,
  ProtheusCredencialData,
  ProtheusCredencialDelegate,
  ProtheusCredencialStore,
  MemoryTokenState,
} from "./_internals/token-types";
import type {
  ProtheusCredencialData,
  ProtheusCredencialDelegate,
  ProtheusCredencialStore,
  MemoryTokenState,
  IProtheusTokenProvider,
} from "./_internals/token-types";

async function tryRefreshToken(tokenUrl: string, basicAuth: string, refreshToken?: string | null): Promise<MemoryTokenState | null> {
  if (!refreshToken) return null;
  try {
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
    const result = await executeOAuthRequest(tokenUrl, basicAuth, body);
    return { accessToken: result.token, refreshToken: result.refreshToken ?? null, expiresAt: result.expiresAt };
  } catch {
    return null;
  }
}

async function tryPasswordToken(tokenUrl: string, basicAuth: string, user: string, pass?: string): Promise<MemoryTokenState | null> {
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

async function fetchTokenFromEnv(baseUrl: string, forceRefresh = false): Promise<MemoryTokenState> {
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

async function fetchDbToken(cred: ProtheusCredencialData): Promise<MemoryTokenState> {
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

function isTokenValid(token: string | null | undefined, expiresAt: Date | null | undefined): boolean {
  return Boolean(token && !isTokenExpired(expiresAt));
}

function resolveCredencial(store: ProtheusCredencialStore, empresaId: string) {
  return store.protheusCredencial?.findUnique({ where: { empresaId } }).catch(() => null) ?? null;
}

function persistToken(credDelegate: ProtheusCredencialDelegate | undefined, empresaId: string, result: MemoryTokenState) {
  if (credDelegate) {
    credDelegate.update({ where: { empresaId }, data: { accessToken: result.accessToken!, expiresAt: result.expiresAt! } });
  }
  setMemoryToken(result.accessToken!, result.expiresAt!, result.refreshToken ?? undefined);
}

async function resolveStoredCredencial(
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

async function resolveCachedOrEnvToken(empresaId: string, forceRefresh: boolean): Promise<string> {
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
  const result = await fetchTokenFromEnv(baseUrl, forceRefresh);
  setMemoryToken(result.accessToken!, result.expiresAt!, result.refreshToken ?? undefined);
  return result.accessToken!;
}

export class DatabaseProtheusTokenProvider implements IProtheusTokenProvider {
  private readonly isExplicitStore: boolean;
  private readonly store: ProtheusCredencialStore;

  constructor(db?: ProtheusCredencialStore) {
    this.isExplicitStore = Boolean(db);
    this.store = db ?? (prisma as unknown as ProtheusCredencialStore);
  }

  async getValidToken(empresaId: string, forceRefresh = false): Promise<string> {
    try {
      const credDelegate = this.store.protheusCredencial;
      const cred = credDelegate ? await resolveCredencial(this.store, empresaId) : null;

      if (this.isExplicitStore && !cred) {
        throw new ProtheusClientError("Credenciais Protheus nao configuradas para esta empresa");
      }

      if (cred) {
        return await resolveStoredCredencial(credDelegate, cred, empresaId, forceRefresh);
      }

      return await resolveCachedOrEnvToken(empresaId, forceRefresh);
    } catch (error) {
      if (error instanceof ProtheusClientError) throw error;
      logApiError("Erro ao obter token do Protheus", error);
      throw new ProtheusClientError("Erro interno ao obter token do Protheus", error);
    }
  }
}

export const protheusTokenProvider = new DatabaseProtheusTokenProvider();
