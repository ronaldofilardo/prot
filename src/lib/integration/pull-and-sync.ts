/**
 * Orquestra uma sincronizacao sob demanda (botao "Atualizar do Protheus"):
 *   ProtheusClient.fetch* -> mesmo adapter do CSV -> mesmo sync-engine
 *
 * Reaproveita 100% do `protheus-adapter.ts` e `sync-engine.ts` ja
 * existentes: o client REST/SOAP so entrega linhas no mesmo formato que
 * o CSV entregava, entao nenhuma logica de sincronizacao precisou mudar.
 *
 * Somente leitura -- nenhum dado e enviado de volta ao Protheus aqui.
 */

import { getProtheusClient } from "./protheus-client-factory";
import type { PullEntityResult } from "./_internals/sync-jobs";
import { JOBS } from "./_internals/sync-jobs-config";
import { executarJob, registrarFalha } from "./_internals/sync-executor";

export type { PullEntityResult } from "./_internals/sync-jobs";

export async function pullAndSyncFromProtheus(
  empresaId: string,
): Promise<PullEntityResult[]> {
  const client = await getProtheusClient(empresaId);
  const resultados: PullEntityResult[] = [];

  for (const job of JOBS) {
    try {
      resultados.push(await executarJob(job, empresaId, client));
    } catch (error) {
      resultados.push(await registrarFalha(job, empresaId, error));
    }
  }

  return resultados;
}