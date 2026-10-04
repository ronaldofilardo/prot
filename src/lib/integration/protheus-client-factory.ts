import { prisma } from "@/lib/db/prisma-client";
import { ProtheusClient, ProtheusClientError } from "./protheus-client";
import { ProtheusRestClient, buildProtheusRestClientFromEnv } from "./protheus-rest-client";
import { buildProtheusSoapClientFromEnv } from "./protheus-soap-client";

/**
 * Ponto unico de escolha do transporte e credenciais de integracao.
 *
 * 1. Se fornecido empresaId e houver ProtheusCredencial no banco:
 *    instancia ProtheusRestClient em modo "oauth2" para aquela empresa.
 * 2. Caso contrario, usa o modo configurado em variaveis de ambiente
 *    (PROTHEUS_INTEGRATION_MODE=rest ou soap).
 */
export async function getProtheusClient(empresaId?: string): Promise<ProtheusClient> {
  if (empresaId) {
    try {
      const credDelegate = (prisma as unknown as { protheusCredencial?: {
        findUnique: (args: { where: { empresaId: string } }) => Promise<{ baseUrl: string } | null>;
      }}).protheusCredencial;

      if (credDelegate) {
        const cred = await credDelegate.findUnique({ where: { empresaId } });
        if (cred) {
          return new ProtheusRestClient({
            baseUrl: cred.baseUrl,
            authMode: "oauth2",
            empresaSaaSId: empresaId,
            empresaId: process.env.PROTHEUS_EMPRESA_ID || "01",
            filial: process.env.PROTHEUS_FILIAL || "01",
            paths: {
              empresa: process.env.PROTHEUS_REST_EMPRESA_PATH,
              clientes: process.env.PROTHEUS_REST_CLIENTES_PATH,
              faturamentos: process.env.PROTHEUS_REST_FATURAMENTOS_PATH,
              contasReceber: process.env.PROTHEUS_REST_CONTAS_RECEBER_PATH,
              baixas: process.env.PROTHEUS_REST_BAIXAS_PATH,
            },
          });
        }
      }
    } catch {
      // Fallback para variaveis de ambiente se a tabela ainda nao existir
    }
  }

  const mode = (process.env.PROTHEUS_INTEGRATION_MODE || "rest").toLowerCase();

  if (mode === "rest") return buildProtheusRestClientFromEnv();
  if (mode === "soap") return buildProtheusSoapClientFromEnv();

  throw new ProtheusClientError(
    `PROTHEUS_INTEGRATION_MODE invalido: '${mode}' (valores aceitos: 'rest' ou 'soap')`
  );
}
