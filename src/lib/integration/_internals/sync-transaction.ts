import { prisma } from "@/lib/db/prisma-client";
import type { PrismaClient } from "@prisma/client";
import type { SyncResult } from "../sync-engine";
import type { SyncFn } from "./sync-jobs";

export async function runSyncInTransaction(
  syncFn: SyncFn,
  entidade: string,
  empresaId: string,
  canonical: unknown[],
): Promise<SyncResult> {
  return prisma.$transaction(async (tx) => {
    const res = await syncFn(tx as PrismaClient, empresaId, canonical);
    await tx.syncLog.create({
      data: {
        empresaId,
        entidade,
        operacao: "manual_pull",
        idempotencyKey: `pull-${entidade}-${Date.now()}`,
        status: res.erros > 0 ? "error" : "success",
        mensagem: `Atualizacao manual: ${res.processados} processados, ${res.criados} criados, ${res.atualizados} atualizados, ${res.erros} erros`,
        tentativas: 1,
      },
    });
    return res;
  });
}

export async function logAndCreateSyncLog(
  empresaId: string,
  entidade: string,
  mensagemErro: string,
): Promise<void> {
  await prisma.syncLog
    .create({
      data: {
        empresaId,
        entidade,
        operacao: "manual_pull",
        idempotencyKey: `pull-${entidade}-${Date.now()}`,
        status: "error",
        categoriaErro: "protheus_unreachable",
        mensagem: mensagemErro,
        tentativas: 1,
      },
    })
    .catch(() => undefined);
}