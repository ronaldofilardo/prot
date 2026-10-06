import { logApiError } from "@/lib/utils/logger";
import type { ProtheusClient, ProtheusRow } from "../protheus-client";
import type { EntityJob, PullEntityResult } from "./sync-jobs";
import { runSyncInTransaction, logAndCreateSyncLog } from "./sync-transaction";

function filterValidRows(rows: ProtheusRow[]): ProtheusRow[] {
  return rows.filter((r) => r.D_E_L_E_T_ !== "*");
}

function mapToCanonical(rows: ProtheusRow[], toCanonical: EntityJob["toCanonical"], empresaId: string): unknown[] {
  return rows.map((r) => toCanonical(r, empresaId));
}

function buildErrorSyncResult(job: EntityJob, mensagemErro: string): PullEntityResult {
  return {
    entidade: job.entidade,
    registros: 0,
    sync: {
      entidade: job.entidade,
      processados: 0,
      criados: 0,
      atualizados: 0,
      erros: 1,
    },
    erro: mensagemErro,
  };
}

export async function executarJob(
  job: EntityJob,
  empresaId: string,
  client: ProtheusClient,
): Promise<PullEntityResult> {
  const rows = await job.fetch(client);
  const validRows = filterValidRows(rows);
  const canonical = mapToCanonical(validRows, job.toCanonical, empresaId);
  const syncResult = await runSyncInTransaction(job.sync, job.entidade, empresaId, canonical);

  return {
    entidade: job.entidade,
    registros: validRows.length,
    sync: syncResult,
  };
}

export async function registrarFalha(
  job: EntityJob,
  empresaId: string,
  error: unknown,
): Promise<PullEntityResult> {
  logApiError(`Erro ao puxar/sincronizar ${job.entidade} do Protheus`, error);
  const mensagemErro = error instanceof Error ? error.message : String(error);

  await logAndCreateSyncLog(empresaId, job.entidade, mensagemErro);

  return buildErrorSyncResult(job, mensagemErro);
}