/**
 * Endpoint de upload — recebe CSVs do Protheus via formulário web.
 *
 * Fluxo: CSV upload → parse → detecção de entidade → adapter canônico → sync engine
 * Não requer API key (é uso interno do SaaS), mas valida autenticação de sessão.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma-client";
import { parse } from "csv-parse/sync";
import {
  csvRowToCanonicalCliente,
  csvRowToCanonicalFaturamento,
  csvRowToCanonicalContaReceber,
  csvRowToCanonicalBaixa,
} from "@/lib/integration/protheus-adapter";
import { syncClientes, syncFaturamentos, syncContasReceber, syncBaixas, type SyncResult } from "@/lib/integration/sync-engine";
import { logApiError } from "@/lib/utils/logger";
import type { PrismaClient } from "@prisma/client";

type SyncFn = (tx: PrismaClient, empresaId: string, registros: unknown[]) => Promise<SyncResult>;

type EntityDetector = {
  entidade: string;
  detect: (headers: string[]) => boolean;
  toCanonical: (row: Record<string, string>, empresaId: string) => unknown;
  sync: SyncFn;
};

const ENTITY_DETECTORS: EntityDetector[] = [
  {
    entidade: "Cliente",
    detect: (h) => h.includes("A1_COD") && h.includes("A1_NOME"),
    toCanonical: (r, e) => csvRowToCanonicalCliente(r, e),
    sync: syncClientes as SyncFn,
  },
  {
    entidade: "Faturamento",
    detect: (h) => h.includes("F2_DOC") && h.includes("F2_VALOR"),
    toCanonical: (r, e) => csvRowToCanonicalFaturamento(r, e),
    sync: syncFaturamentos as SyncFn,
  },
  {
    entidade: "ContaReceber",
    detect: (h) => h.includes("E1_PREFIXO") && h.includes("E1_NUM"),
    toCanonical: (r, e) => csvRowToCanonicalContaReceber(r, e),
    sync: syncContasReceber as SyncFn,
  },
  {
    entidade: "Baixa",
    detect: (h) => h.includes("E5_PREFIXO") && h.includes("E5_VALOR"),
    toCanonical: (r, e) => csvRowToCanonicalBaixa(r, e),
    sync: syncBaixas as SyncFn,
  },
];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const empresaId = (session?.user as { empresaId?: string } | undefined)?.empresaId;
    if (!empresaId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const resultados: Array<{ arquivo: string; entidade: string; registros: number; sync: SyncResult }> = [];

    for (const file of files) {
      const content = await file.text();
      const cleaned = content.replace(/^\uFEFF/, "");

      const records = parse(cleaned, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        delimiter: ";",
      }) as Record<string, string>[];

      if (records.length === 0) continue;

      const headers = Object.keys(records[0]);
      const detector = ENTITY_DETECTORS.find((d) => d.detect(headers));

      if (!detector) {
        resultados.push({
          arquivo: file.name,
          entidade: "desconhecida",
          registros: 0,
          sync: { entidade: "?", processados: 0, criados: 0, atualizados: 0, erros: 0 },
        });
        continue;
      }

      const validRecords = records.filter((r) => r.D_E_L_E_T_ !== "*");
      const canonical = validRecords.map((r) => detector.toCanonical(r, empresaId));

      const syncResult = await prisma.$transaction(async (tx) => {
        const res = await detector.sync(tx as PrismaClient, empresaId, canonical);
        await tx.syncLog.create({
          data: {
            empresaId,
            entidade: detector.entidade,
            operacao: "csv_upload",
            idempotencyKey: `upload-${file.name}-${Date.now()}`,
            status: res.erros > 0 ? "error" : "success",
            mensagem: `${file.name}: ${res.processados} processados, ${res.criados} criados, ${res.atualizados} atualizados, ${res.erros} erros`,
            tentativas: 1,
          },
        });
        return res;
      });

      resultados.push({
        arquivo: file.name,
        entidade: detector.entidade,
        registros: validRecords.length,
        sync: syncResult,
      });
    }

    return NextResponse.json({ success: true, resultados });
  } catch (error) {
    logApiError("Erro no upload de CSV", error);
    return NextResponse.json({ error: "Erro interno no upload" }, { status: 500 });
  }
}
