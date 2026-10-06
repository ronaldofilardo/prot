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
import { getMemoryToken, setMemoryToken } from "./_internals/token-env-sync";

export interface IProtheusTokenProvider {
  getValidToken(empresaId: string, forceRefresh?: boolean): Promise<string>;
}

export interface ProtheusCredencialData {
  empresaId: string;
  baseUrl: string;
  clientId: string;
  username: string;
  passwordEnc: string;
  accessToken?: string | null;
  expiresAt?: Date | null;
}

export interface ProtheusCredencialDelegate {
  findUnique(args: { where: { empresaId: string } }): Promise<ProtheusCredencialData | null>;
  update(args: {
    where: { empresaId: string };
    data: { accessToken: string; expiresAt: Date };
  }): Promise<unknown>;
}

export interface ProtheusCredencialStore {
  protheusCredencial?: ProtheusCredencialDelegate;
}

interface MemoryTokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}

async function fetchTokenFromEnv(baseUrl: string): Promise<MemoryTokenState> {
  const tokenUrl = resolveTokenUrl(baseUrl);
  const user = process.env.PROTHEUS_REST_USER;
  const pass = process.env.PROTHEUS_REST_PASSWORD;
  const clientId = process.env.PROTHEUS_REST_CLIENT_ID || user || "admin";
  const basicAuth = Buffer.from(`${clientId}:${clientId}`).toString("base64");
  const mem = getMemoryToken();
  const refreshToken = mem.refreshToken || process.env.PROTHEUS_REST_REFRESH_TOKEN;

  if (refreshToken) {
    try {
      const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
      const result = await executeOAuthRequest(tokenUrl, basicAuth, body);
      return { accessToken: result.token, refreshToken: result.refreshToken ?? null, expiresAt: result.expiresAt };
    } catch {
      // Fallback para credenciais se refresh_token expirar
    }
  }

  if (user && pass) {
    const body = new URLSearchParams({ grant_type: "password", username: user, password: pass });
    const result = await executeOAuthRequest(tokenUrl, basicAuth, body);
    return { accessToken: result.token, refreshToken: result.refreshToken ?? null, expiresAt: result.expiresAt };
  }

  throw new ProtheusClientError("Nenhum mecanismo de renovacao automatica configurado (usuario/senha ou refresh_token)");
}

async function fetchDbToken(cred: ProtheusCredencialData): Promise<MemoryTokenState> {
  const tokenUrl = resolveTokenUrl(cred.baseUrl);
  const password = decryptText(cred.passwordEnc);
  const basicAuth = Buffer.from(`${cred.clientId}:${cred.clientId}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "password", username: cred.username, password });
  const result = await executeOAuthRequest(tokenUrl, basicAuth, body);
  return { accessToken: result.token, refreshToken: result.refreshToken ?? null, expiresAt: result.expiresAt };
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
        if (!forceRefresh && isTokenValid(cred.accessToken, cred.expiresAt)) {
          return cred.accessToken!;
        }
        logIntegration("Gerando/renovando token Protheus sob demanda", { empresaId, forceRefresh });
        const result = await fetchDbToken(cred);
        persistToken(credDelegate, empresaId, result);
        return result.accessToken!;
      }

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
      const baseUrl = process.env.PROTHEUS_REST_BASE_URL;
      if (!baseUrl) throw new ProtheusClientError("URL base do Protheus nao configurada para renovacao");

      const result = await fetchTokenFromEnv(baseUrl);
      setMemoryToken(result.accessToken!, result.expiresAt!, result.refreshToken ?? undefined);
      return result.accessToken!;
    } catch (error) {
      if (error instanceof ProtheusClientError) throw error;
      logApiError("Erro ao obter token do Protheus", error);
      throw new ProtheusClientError("Erro interno ao obter token do Protheus", error);
    }
  }
}

export const protheusTokenProvider = new DatabaseProtheusTokenProvider();
