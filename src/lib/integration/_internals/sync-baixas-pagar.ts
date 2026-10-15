import type { PrismaClient } from "@prisma/client";
import type { CanonicalPayment } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart, logSyncSuccess } from "../logger";
import { parseBaixaPagarExternalId, parseContaPagarExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";

async function upsertBaixaPagar(
  tx: PrismaClient,
  empresaId: string,
  reg: CanonicalPayment
): Promise<"created" | "exists" | "no-conta"> {
  const chaveConta = parseContaPagarExternalId(reg.titleExternalId);
  const contaPagar = await tx.contaPagar.findUnique({
    where: {
      filial_prefixo_numero_parcela_tipo_fornecedorCodigo_fornecedorLoja_empresaId: {
        ...chaveConta,
        empresaId,
      },
    },
  });
  if (!contaPagar) return "no-conta";

  const { prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela } = parseBaixaPagarExternalId(reg.externalId);
  const dataBaixa = new Date(reg.paymentDate);
  const sequencia = reg.sequence ?? null;

  if (sequencia !== null) {
    const existing = await tx.baixaPagar.findUnique({
      where: { contaPagarId_sequencia_dataBaixa: { contaPagarId: contaPagar.id, sequencia, dataBaixa } },
    });
    if (existing) return "exists";
  } else {
    const existing = await tx.baixaPagar.findFirst({
      where: { contaPagarId: contaPagar.id, sequencia: null, dataBaixa, valorBaixa: reg.amount, empresaId },
    });
    if (existing) return "exists";
  }

  await tx.baixaPagar.create({
    data: {
      filial: reg.branch,
      filialBaixa: reg.paymentBranch,
      prefixo: bxPrefixo,
      numero: bxNumero,
      parcela: bxParcela,
      tipo: reg.type,
      sequencia,
      valorBaixa: reg.amount,
      dataBaixa,
      contaPagarId: contaPagar.id,
      empresaId,
    },
  });
  return "created";
}

export async function syncBaixasPagar(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalPayment[]
): Promise<SyncResult> {
  logSyncStart("BaixaPagar", empresaId, registros.length);
  let criados = 0, atualizados = 0, erros = 0;

  for (const reg of registros) {
    try {
      const outcome = await upsertBaixaPagar(tx, empresaId, reg);
      if (outcome === "no-conta") {
        logSyncSkip("BaixaPagar", reg.externalId, "conta a pagar nao encontrada");
        erros++;
        continue;
      }
      if (outcome === "exists") {
        logSyncSkip("BaixaPagar", reg.externalId, "ja existe");
        continue;
      }
      criados++;
      logSyncSuccess("BaixaPagar", reg.externalId, "insert");
    } catch (err) {
      erros++;
      logSyncError("BaixaPagar", reg.externalId, err);
    }
  }

  return { entidade: "BaixaPagar", processados: registros.length, criados, atualizados, erros };
}
