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
import {
  syncClientes,
  syncFaturamentos,
  syncContasReceber,
  syncBaixas,
  type SyncResult,
} from "./sync-engine";
import { logApiError } from "@/lib/utils/logger";
import {
  fetchFiliasDaMatriz,
  fetchDadosDeFilial,
  agregarDadosDeFiliais,
} from "./_internals/sync-multi-filial";

export interface PullEntityResult {
  entidade: string;
  registros: number;
  sync: SyncResult;
  erro?: string;
}

type SyncFn = (
  tx: PrismaClient,
  empresaId: string,
  registros: unknown[],
) => Promise<SyncResult>;

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

async function executarJob(
  job: EntityJob,
  empresaId: string,
  client: ProtheusClient,
): Promise<PullEntityResult> {
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

  return {
    entidade: job.entidade,
    registros: validRows.length,
    sync: syncResult,
  };
}

async function registrarFalha(
  job: EntityJob,
  empresaId: string,
  error: unknown,
): Promise<PullEntityResult> {
  logApiError(`Erro ao puxar/sincronizar ${job.entidade} do Protheus`, error);
  const mensagemErro = error instanceof Error ? error.message : String(error);

  // Registra a falha no SyncLog mesmo sem ter chegado a sincronizar
  // nada, para o erro ficar visível no histórico (mesmo padrão usado
  // pelas outras entradas: upload de CSV e ingest via API key).
  await prisma.syncLog
    .create({
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
    })
    .catch(() => undefined);

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

export async function pullAndSyncFromProtheus(
  empresaId: string,
): Promise<PullEntityResult[]> {
  const client = await getProtheusClient(empresaId);
  const resultados: PullEntityResult[] = [];

  try {
    // Busca todas as filiais da matriz
    const filias = await fetchFiliasDaMatriz(client);
    logApiError("[DEBUG] Filiais encontradas:", {
      count: filias.length,
      filias,
    });

    // Para cada filial, busca os dados
    const filiasDados = await Promise.all(
      filias.map(async (filial) => ({
        filial,
        dados: await fetchDadosDeFilial(client, filial),
      })),
    );

    // Agrega dados de todas as filiais
    const dadosAgregados = agregarDadosDeFiliais(filiasDados);

    // Cria rows agregadas com todos os dados de todas as filiais
    const rowsMultiFilial = {
      clientes: dadosAgregados.clientes,
      faturamentos: dadosAgregados.faturamentos,
      contasReceber: dadosAgregados.contasReceber,
      baixas: dadosAgregados.baixas,
    };

    // Executa sync com dados agregados
    for (const job of JOBS) {
      try {
        const jobData = getJobData(job.entidade, rowsMultiFilial);
        const validRows = jobData.filter(
          (r: ProtheusRow) => r.D_E_L_E_T_ !== "*",
        );
        const canonical = validRows.map((r: ProtheusRow) =>
          job.toCanonical(r, empresaId),
        );

        const syncResult = await prisma.$transaction(async (tx) => {
          const res = await job.sync(tx as PrismaClient, empresaId, canonical);
          await tx.syncLog.create({
            data: {
              empresaId,
              entidade: job.entidade,
              operacao: "manual_pull",
              idempotencyKey: `pull-${job.entidade}-${Date.now()}`,
              status: res.erros > 0 ? "error" : "success",
              mensagem: `Atualizacao manual (${filias.length} filiais): ${res.processados} processados, ${res.criados} criados, ${res.atualizados} atualizados, ${res.erros} erros`,
              tentativas: 1,
            },
          });
          return res;
        });

        resultados.push({
          entidade: job.entidade,
          registros: validRows.length,
          sync: syncResult,
        });
      } catch (error) {
        resultados.push(await registrarFalha(job, empresaId, error));
      }
    }
  } catch (error) {
    logApiError("Erro ao buscar filiais do Protheus", error);
    // Se falhar ao buscar filiais, tenta com a filial padrão
    for (const job of JOBS) {
      try {
        resultados.push(await executarJob(job, empresaId, client));
      } catch (err) {
        resultados.push(await registrarFalha(job, empresaId, err));
      }
    }
  }

  return resultados;
}

function getJobData(
  entidade: string,
  rowsMultiFilial: {
    clientes: ProtheusRow[];
    faturamentos: ProtheusRow[];
    contasReceber: ProtheusRow[];
    baixas: ProtheusRow[];
  },
): ProtheusRow[] {
  switch (entidade) {
    case "Cliente":
      return rowsMultiFilial.clientes;
    case "Faturamento":
      return rowsMultiFilial.faturamentos;
    case "ContaReceber":
      return rowsMultiFilial.contasReceber;
    case "Baixa":
      return rowsMultiFilial.baixas;
    default:
      return [];
  }
}
