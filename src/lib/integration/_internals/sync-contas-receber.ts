import type { PrismaClient } from "@prisma/client";
import type { CanonicalTitle } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart, logSyncSuccess } from "../logger";
import { parseContaReceberExternalId } from "./sync-parsers";
import { resolveClienteByExternalId } from "./sync-resolve";
import type { SyncResult } from "./sync-types";

async function upsertContaReceber(
  tx: PrismaClient,
  empresaId: string,
  reg: CanonicalTitle
): Promise<"update" | "insert" | "skip"> {
  const { filial, prefixo, numero, parcela } = parseContaReceberExternalId(reg.externalId);
  const existing = await tx.contaReceber.findUnique({ where: { filial_prefixo_numero_parcela_empresaId: { filial, prefixo, numero, parcela, empresaId } } });

  if (existing) {
    await tx.contaReceber.update({ where: { id: existing.id }, data: { valor: reg.amount, vencimento: new Date(reg.dueDate) } });
    return "update";
  }

  const cliente = await resolveClienteByExternalId(tx, reg.partyExternalId, empresaId);
  if (!cliente) {
    logSyncSkip("ContaReceber", reg.externalId, "cliente nao encontrado");
    return "skip";
  }

  await tx.contaReceber.create({
    data: {
      filial, prefixo, numero, parcela, tipo: reg.type,
      dataEmissao: new Date(reg.issueDate), vencimento: new Date(reg.dueDate),
      valor: reg.amount, clienteId: cliente.id, empresaId,
    },
  });
  return "insert";
}

export async function syncContasReceber(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalTitle[]
): Promise<SyncResult> {
  logSyncStart("ContaReceber", empresaId, registros.length);
  let criados = 0, atualizados = 0, erros = 0;

  for (const reg of registros) {
    try {
      const action = await upsertContaReceber(tx, empresaId, reg);
      if (action === "skip") {
        erros++;
        continue;
      }
      if (action === "insert") criados++;
      else atualizados++;
      logSyncSuccess("ContaReceber", reg.externalId, action);
    } catch (err) {
      erros++;
      logSyncError("ContaReceber", reg.externalId, err);
    }
  }

  return { entidade: "ContaReceber", processados: registros.length, criados, atualizados, erros };
}
