/**
 * Orquestra uma sincronização sob demanda (botão "Atualizar do Protheus"):
 *   ProtheusClient.fetch* → mesmo adapter do CSV → mesmo sync-engine
 *
 * Reaproveita 100% do `protheus-adapter.ts` e `sync-engine.ts` já
 * existentes: o client REST/SOAP só entrega linhas no mesmo formato que
 * o CSV entregava, então nenhuma lógica de sincronização precisou mudar.
 *
 * Somente leitura — nenhum dado é enviado de volta ao Protheus aqui.
 */

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma-client";
import { getProtheusClient } from "./protheus-client-factory";
import type { ProtheusClient, ProtheusRow } from "./protheus-client";
import {
  csvRowToCanonicalCliente,
  csvRowToCanonicalFaturamento,
  csvRowToCanonicalContaReceber,
  csvRowToCanonicalBaixa,
} from "./protheus-adapter";
import { syncClientes, syncFaturamentos, syncContasReceber, syncBaixas, type SyncResult } from "./sync-engine";
import { logApiError } from "@/lib/utils/logger";

export interface PullEntityResult {
  entidade: string;
  registros: number;
  sync: SyncResult;
  erro?: string;
}

type SyncFn = (tx: PrismaClient, empresaId: string, registros: unknown[]) => Promise<SyncResult>;

interface EntityJob {
  entidade: "Cliente" | "Faturamento" | "ContaReceber" | "Baixa";
  fetch: (client: ProtheusClient) => Promise<ProtheusRow[]>;
  toCanonical: (row: ProtheusRow, empresaId: string) => unknown;
  sync: SyncFn;
}

// Ordem importa: Cliente precisa existir antes de Faturamento/ContaReceber
// (que referenciam o cliente pelo externalId), e ContaReceber antes de
// Baixa (que referencia o título).
const JOBS: EntityJob[] = [
  {
    entidade: "Cliente",
    fetch: (c) => c.fetchClientes(),
    toCanonical: csvRowToCanonicalCliente,
    sync: syncClientes as SyncFn,
  },
  {
    entidade: "Faturamento",
    fetch: (c) => c.fetchFaturamentos(),
    toCanonical: csvRowToCanonicalFaturamento,
    sync: syncFaturamentos as SyncFn,
  },
  {
    entidade: "ContaReceber",
    fetch: (c) => c.fetchContasReceber(),
    toCanonical: csvRowToCanonicalContaReceber,
    sync: syncContasReceber as SyncFn,
  },
  {
    entidade: "Baixa",
    fetch: (c) => c.fetchBaixas(),
    toCanonical: csvRowToCanonicalBaixa,
    sync: syncBaixas as SyncFn,
  },
];

export async function pullAndSyncFromProtheus(empresaId: string): Promise<PullEntityResult[]> {
  const client = getProtheusClient();
  const resultados: PullEntityResult[] = [];

  for (const job of JOBS) {
    try {
      const rows = await job.fetch(client);
      const validRows = rows.filter((r) => r.D_E_L_E_T_ !== "*");
      const canonical = validRows.map((r) => job.toCanonical(r, empresaId));

      const syncResult = await prisma.$transaction(async (tx) => {
        const res = await job.sync(tx as PrismaClient, empresaId, canonical);
        await tx.syncLog.create({
          data: {
            empresaId,
            entidade: job.entidade,
            operacao: "manual_pull",
            idempotencyKey: `pull-${job.entidade}-${Date.now()}`,
            status: res.erros > 0 ? "error" : "success",
            mensagem: `Atualizacao manual: ${res.processados} processados, ${res.criados} criados, ${res.atualizados} atualizados, ${res.erros} erros`,
            tentativas: 1,
          },
        });
        return res;
      });

      resultados.push({ entidade: job.entidade, registros: validRows.length, sync: syncResult });
    } catch (error) {
      logApiError(`Erro ao puxar/sincronizar ${job.entidade} do Protheus`, error);
      const mensagemErro = error instanceof Error ? error.message : String(error);

      // Registra a falha no SyncLog mesmo sem ter chegado a sincronizar
      // nada, para o erro ficar visível no histórico (mesmo padrão usado
      // pelas outras entradas: upload de CSV e ingest via API key).
      await prisma.syncLog.create({
        data: {
          empresaId,
          entidade: job.entidade,
          operacao: "manual_pull",
          idempotencyKey: `pull-${job.entidade}-${Date.now()}`,
          status: "error",
          categoriaErro: "protheus_unreachable",
          mensagem: mensagemErro,
          tentativas: 1,
        },
      }).catch(() => undefined);

      resultados.push({
        entidade: job.entidade,
        registros: 0,
        sync: { entidade: job.entidade, processados: 0, criados: 0, atualizados: 0, erros: 1 },
        erro: mensagemErro,
      });
    }
  }

  return resultados;
}
