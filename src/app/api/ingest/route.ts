/**
 * Endpoint de ingestão — recebe dados canônicos e sincroniza com o banco.
 *
 * Referência: guia de integração §2 "modelo de integração":
 * - POST com payload canônico (desacoplado do Protheus)
 * - Uso de transação com RLS (defesa em profundidade)
 * - Log de operações no SyncLog
 *
 * POST /api/ingest
 * Body: { empresaId, entidade, registros }
 */

import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma-client";
import type { EntidadeCanonica, IngestPayload } from "@/lib/integration/canonical";
import {
  syncClientes,
  syncFaturamentos,
  syncContasReceber,
  syncBaixas,
  type SyncResult,
} from "@/lib/integration/sync-engine";
import { logApiError } from "@/lib/utils/logger";

type SyncFunction = (
  tx: PrismaClient,
  empresaId: string,
  registros: unknown[]
) => Promise<SyncResult>;

const SYNC_MAP: Record<EntidadeCanonica, SyncFunction> = {
  Cliente: syncClientes as unknown as SyncFunction,
  Fornecedor: async () => ({ entidade: "Fornecedor", processados: 0, criados: 0, atualizados: 0, erros: 0 }),
  Faturamento: syncFaturamentos as unknown as SyncFunction,
  ContaReceber: syncContasReceber as unknown as SyncFunction,
  ContaPagar: async () => ({ entidade: "ContaPagar", processados: 0, criados: 0, atualizados: 0, erros: 0 }),
  Baixa: syncBaixas as unknown as SyncFunction,
};

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");
    const expectedApiKey =
      process.env.INGEST_API_KEY || process.env.SYNC_API_KEY || "ingest-secret-key-change-me";

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: "API Key invalida ou ausente" },
        { status: 401 }
      );
    }

    const payload: IngestPayload = await request.json();

    if (!payload.empresaId || !payload.entidade || !Array.isArray(payload.registros)) {
      return NextResponse.json(
        { error: "Payload invalido: empresaId, entidade e registros[] sao obrigatorios" },
        { status: 400 }
      );
    }

    const syncFn = SYNC_MAP[payload.entidade];
    if (!syncFn) {
      return NextResponse.json(
        { error: `Entidade '${payload.entidade}' nao suportada` },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const res = await syncFn(tx as PrismaClient, payload.empresaId, payload.registros);

      await tx.syncLog.create({
        data: {
          empresaId: payload.empresaId,
          entidade: payload.entidade,
          operacao: "batch_upsert",
          idempotencyKey: `batch-${payload.entidade}-${Date.now()}`,
          status: res.erros > 0 ? "error" : "success",
          mensagem: `${res.processados} processados, ${res.criados} criados, ${res.atualizados} atualizados, ${res.erros} erros`,
          tentativas: 1,
        },
      });

      return res;
    });

    return NextResponse.json({
      success: true,
      resultado,
    });
  } catch (error) {
    logApiError("Erro no endpoint de ingestao", error);
    return NextResponse.json({ error: "Erro interno na ingestao" }, { status: 500 });
  }
}
