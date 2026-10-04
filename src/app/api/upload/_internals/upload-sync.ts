import { prisma } from "@/lib/db/prisma-client";
import type { PrismaClient } from "@prisma/client";
import type { EntityDetector } from "./csv-detect";

interface ExecutarSyncParams {
  empresaId: string;
  fileName: string;
  detector: EntityDetector;
  canonical: unknown[];
}

export async function executarSyncComLog(params: ExecutarSyncParams) {
  const { empresaId, fileName, detector, canonical } = params;
  return prisma.$transaction(async (tx) => {
    const res = await detector.sync(tx as PrismaClient, empresaId, canonical);
    await tx.syncLog.create({
      data: {
        empresaId,
        entidade: detector.entidade,
        operacao: "csv_upload",
        idempotencyKey: `upload-${fileName}-${Date.now()}`,
        status: res.erros > 0 ? "error" : "success",
        mensagem: `${fileName}: ${res.processados} processados, ${res.criados} criados, ${res.atualizados} atualizados, ${res.erros} erros`,
        tentativas: 1,
      },
    });
    return res;
  });
}
