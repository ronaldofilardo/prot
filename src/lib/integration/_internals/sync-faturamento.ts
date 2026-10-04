import type { PrismaClient } from "@prisma/client";
import type { CanonicalInvoice } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart, logSyncSuccess } from "../logger";
import { parseFaturamentoExternalId } from "./sync-parsers";
import { resolveClienteByExternalId } from "./sync-resolve";
import type { SyncResult } from "./sync-types";

async function upsertFaturamento(
  tx: PrismaClient,
  empresaId: string,
  reg: CanonicalInvoice
): Promise<"update" | "insert" | "skip"> {
  const { filial, numeroNota } = parseFaturamentoExternalId(reg.externalId);
  const existing = await tx.faturamento.findUnique({
    where: { filial_numeroNota_empresaId: { filial, numeroNota, empresaId } },
  });

  if (existing) {
    await tx.faturamento.update({
      where: { id: existing.id },
      data: { valorTotal: reg.amount, dataEmissao: new Date(reg.issueDate) },
    });
    return "update";
  }

  const cliente = await resolveClienteByExternalId(tx, reg.partyExternalId, empresaId);
  if (!cliente) {
    logSyncSkip("Faturamento", reg.externalId, "cliente nao encontrado");
    return "skip";
  }

  await tx.faturamento.create({
    data: { filial, numeroNota, dataEmissao: new Date(reg.issueDate), valorTotal: reg.amount, clienteId: cliente.id, empresaId },
  });
  return "insert";
}

export async function syncFaturamentos(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalInvoice[]
): Promise<SyncResult> {
  logSyncStart("Faturamento", empresaId, registros.length);
  let criados = 0, atualizados = 0, erros = 0;

  for (const reg of registros) {
    try {
      const action = await upsertFaturamento(tx, empresaId, reg);
      if (action === "skip") {
        erros++;
        continue;
      }
      if (action === "insert") criados++;
      else atualizados++;
      logSyncSuccess("Faturamento", reg.externalId, action);
    } catch (err) {
      erros++;
      logSyncError("Faturamento", reg.externalId, err);
    }
  }

  return { entidade: "Faturamento", processados: registros.length, criados, atualizados, erros };
}
