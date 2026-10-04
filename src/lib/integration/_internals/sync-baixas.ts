import type { PrismaClient } from "@prisma/client";
import type { CanonicalPayment } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart, logSyncSuccess } from "../logger";
import { parseBaixaExternalId, parseContaReceberExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";

async function createBaixaIfNew(
  tx: PrismaClient,
  empresaId: string,
  reg: CanonicalPayment
): Promise<"created" | "exists" | "no-conta"> {
  const { filial, prefixo, numero, parcela } = parseContaReceberExternalId(reg.titleExternalId);
  const contaReceber = await tx.contaReceber.findUnique({
    where: { filial_prefixo_numero_parcela_empresaId: { filial, prefixo, numero, parcela, empresaId } },
  });
  if (!contaReceber) return "no-conta";

  const { prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela } = parseBaixaExternalId(reg.externalId);
  const existing = await tx.baixa.findFirst({
    where: { contaReceberId: contaReceber.id, prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela, empresaId },
  });
  if (existing) return "exists";

  await tx.baixa.create({
    data: {
      filial: reg.branch, filialBaixa: reg.paymentBranch, prefixo: bxPrefixo, numero: bxNumero,
      parcela: bxParcela, tipo: reg.type, valorBaixa: reg.amount, dataBaixa: new Date(reg.paymentDate),
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
  let criados = 0, erros = 0;

  for (const reg of registros) {
    try {
      const outcome = await createBaixaIfNew(tx, empresaId, reg);
      if (outcome === "no-conta") {
        logSyncSkip("Baixa", reg.externalId, "conta a receber nao encontrada");
        erros++;
        continue;
      }
      if (outcome === "exists") {
        logSyncSkip("Baixa", reg.externalId, "ja existe");
        continue;
      }
      criados++;
      logSyncSuccess("Baixa", reg.externalId, "insert");
    } catch (err) {
      erros++;
      logSyncError("Baixa", reg.externalId, err);
    }
  }

  return { entidade: "Baixa", processados: registros.length, criados, atualizados: 0, erros };
}
