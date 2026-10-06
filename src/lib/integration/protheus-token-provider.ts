import { prisma } from "@/lib/db/prisma-client";
import { ProtheusClientError } from "./protheus-client";
import { logApiError, logIntegration } from "@/lib/utils/logger";
import type {
  IProtheusTokenProvider,
  ProtheusCredencialData,
  ProtheusCredencialDelegate,
  ProtheusCredencialStore,
  MemoryTokenState,
} from "./_internals/token-types";
import { resolveStoredCredencial, resolveCachedOrEnvToken } from "./_internals/token-resolve";
import { resolveCredencial } from "./_internals/token-resolve";

export type {
  IProtheusTokenProvider,
  ProtheusCredencialData,
  ProtheusCredencialDelegate,
  ProtheusCredencialStore,
  MemoryTokenState,
} from "./_internals/token-types";

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