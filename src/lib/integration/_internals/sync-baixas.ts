import type { PrismaClient } from "@prisma/client";
import type { CanonicalPayment } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart, logSyncSuccess } from "../logger";
import { parseBaixaExternalId, parseContaReceberExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";

async function upsertBaixa(
  tx: PrismaClient,
  empresaId: string,
  reg: CanonicalPayment
): Promise<"created" | "updated" | "exists" | "no-conta"> {
  const { filial, prefixo, numero, parcela } = parseContaReceberExternalId(reg.titleExternalId);
  const contaReceber = await tx.contaReceber.findUnique({
    where: { filial_prefixo_numero_parcela_empresaId: { filial, prefixo, numero, parcela, empresaId } },
  });
  if (!contaReceber) return "no-conta";

  const { prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela } = parseBaixaExternalId(reg.externalId);
  const dataBaixa = new Date(reg.paymentDate);
  const sequencia = reg.sequence ?? null;

  if (sequencia !== null) {
    const existing = await tx.baixa.findUnique({
      where: { contaReceberId_sequencia_dataBaixa: { contaReceberId: contaReceber.id, sequencia, dataBaixa } },
    });
    if (existing) return "exists";

    const legacy = await tx.baixa.findFirst({
      where: { contaReceberId: contaReceber.id, sequencia: null, dataBaixa, valorBaixa: reg.amount, empresaId },
    });
    if (legacy) {
      await tx.baixa.update({ where: { id: legacy.id }, data: { sequencia } });
      return "updated";
    }
  } else {
    const existing = await tx.baixa.findFirst({
      where: { contaReceberId: contaReceber.id, prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela, dataBaixa, empresaId },
    });
    if (existing) return "exists";
  }

  await tx.baixa.create({
    data: {
      filial: reg.branch, filialBaixa: reg.paymentBranch, prefixo: bxPrefixo, numero: bxNumero,
      parcela: bxParcela, tipo: reg.type, sequencia, valorBaixa: reg.amount, dataBaixa,
      contaReceberId: contaReceber.id, empresaId,
    },
  });
  return "created";
}

export async function syncBaixas(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalPayment[]
): Promise<SyncResult> {
  logSyncStart("Baixa", empresaId, registros.length);
  let criados = 0, atualizados = 0, erros = 0;

  for (const reg of registros) {
    try {
      const outcome = await upsertBaixa(tx, empresaId, reg);
      if (outcome === "no-conta") {
        logSyncSkip("Baixa", reg.externalId, "conta a receber nao encontrada");
        erros++;
        continue;
      }
      if (outcome === "exists") {
        logSyncSkip("Baixa", reg.externalId, "ja existe");
        continue;
      }
      if (outcome === "updated") {
        atualizados++;
        logSyncSuccess("Baixa", reg.externalId, "update");
        continue;
      }
      criados++;
      logSyncSuccess("Baixa", reg.externalId, "insert");
    } catch (err) {
      erros++;
      logSyncError("Baixa", reg.externalId, err);
    }
  }

  return { entidade: "Baixa", processados: registros.length, criados, atualizados, erros };
}
