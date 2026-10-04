import { prisma } from "@/lib/db/prisma-client";
import { decryptText } from "@/lib/security/crypto-vault";
import { ProtheusClientError } from "./protheus-client";
import { logIntegration, logApiError } from "@/lib/utils/logger";

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

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
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

export class DatabaseProtheusTokenProvider implements IProtheusTokenProvider {
  private readonly store: ProtheusCredencialStore;

  constructor(db: ProtheusCredencialStore = prisma as unknown as ProtheusCredencialStore) {
    this.store = db;
  }

  private resolveTokenUrl(baseUrl: string): string {
    const clean = baseUrl.replace(/\/+$/, "");
    return clean.endsWith("/rest") ? `${clean}/api/oauth2/v1/token` : `${clean}/rest/api/oauth2/v1/token`;
  }

  private isTokenFresh(expiresAt: Date | null | undefined): boolean {
    if (!expiresAt) return false;
    const SAFETY_MARGIN_MS = 60 * 1000;
    return expiresAt.getTime() - Date.now() > SAFETY_MARGIN_MS;
  }

  private async fetchNewToken(cred: ProtheusCredencialData): Promise<{ token: string; expiresAt: Date }> {
    const tokenUrl = this.resolveTokenUrl(cred.baseUrl);
    const password = decryptText(cred.passwordEnc);
    const basicAuth = Buffer.from(`${cred.clientId}:${cred.clientId}`).toString("base64");

    const body = new URLSearchParams({
      grant_type: "password",
      username: cred.username,
      password,
    });

    let res: Response;
    try {
      res = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        cache: "no-store",
      });
    } catch (err) {
      throw new ProtheusClientError("Falha de rede ao conectar com servico de autenticacao do Protheus", err);
    }

    if (!res.ok) {
      logIntegration("Falha na requisicao de token Protheus", { status: res.status });
      if (res.status === 400 || res.status === 401) {
        throw new ProtheusClientError("Credenciais Protheus invalidas ou nao autorizadas");
      }
      throw new ProtheusClientError(`Servico de autenticacao do Protheus retornou status ${res.status}`);
    }

    const data = (await res.json()) as OAuthTokenResponse;
    if (!data.access_token) {
      throw new ProtheusClientError("Resposta de token invalida do Protheus (access_token ausente)");
    }

    const durationSec = Number(data.expires_in) || 3600;
    const expiresAt = new Date(Date.now() + durationSec * 1000);
    return { token: data.access_token, expiresAt };
  }

  async getValidToken(empresaId: string, forceRefresh = false): Promise<string> {
    try {
      // Delegate acessivel via Prisma Client
      const credDelegate = this.store.protheusCredencial;

      if (!credDelegate) {
        throw new ProtheusClientError("Modelo ProtheusCredencial ainda nao carregado no Prisma Client");
      }

      const cred = await credDelegate.findUnique({ where: { empresaId } });
      if (!cred) {
        throw new ProtheusClientError("Credenciais Protheus nao configuradas para esta empresa");
      }

      if (!forceRefresh && cred.accessToken && this.isTokenFresh(cred.expiresAt)) {
        return cred.accessToken;
      }

      logIntegration("Gerando/renovando token Protheus sob demanda", { empresaId, forceRefresh });
      const { token, expiresAt } = await this.fetchNewToken(cred);

      await credDelegate.update({
        where: { empresaId },
        data: { accessToken: token, expiresAt },
      });

      return token;
    } catch (error) {
      if (error instanceof ProtheusClientError) throw error;
      logApiError("Erro ao obter token do Protheus", error);
      throw new ProtheusClientError("Erro interno ao obter token do Protheus", error);
    }
  }
}

export const protheusTokenProvider = new DatabaseProtheusTokenProvider();
