import type { PrismaClient } from "@prisma/client";
import type { CanonicalSaldoContabil } from "../canonical";
import { logSyncError, logSyncStart, logSyncSuccess } from "../logger";
import { parseSaldoContabilExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";

async function updateSaldoContabil(
  tx: PrismaClient,
  existingId: string,
  reg: CanonicalSaldoContabil
): Promise<void> {
  await tx.saldoContabil.update({
    where: { id: existingId },
    data: {
      saldoAnterior: reg.previousBalance,
      debitos: reg.debits,
      creditos: reg.credits,
      saldoAtual: reg.currentBalance,
      exercicio: reg.fiscalYear,
    },
  });
}

async function createSaldoContabil(
  tx: PrismaClient,
  empresaId: string,
  reg: CanonicalSaldoContabil,
  filial: string,
  conta: string,
  competencia: string
): Promise<void> {
  await tx.saldoContabil.create({
    data: {
      filial,
      conta,
      competencia,
      saldoAnterior: reg.previousBalance,
      debitos: reg.debits,
      creditos: reg.credits,
      saldoAtual: reg.currentBalance,
      exercicio: reg.fiscalYear,
      empresaId,
    },
  });
}

async function upsertSaldoContabil(
  tx: PrismaClient,
  empresaId: string,
  payload: { reg: CanonicalSaldoContabil; filial: string; conta: string; competencia: string }
): Promise<"update" | "insert"> {
  const { reg, filial, conta, competencia } = payload;

  const existing = await tx.saldoContabil.findUnique({
    where: { filial_conta_competencia_empresaId: { filial, conta, competencia, empresaId } },
  });

  if (existing) {
    await updateSaldoContabil(tx, existing.id, reg);
    return "update";
  }

  await createSaldoContabil(tx, empresaId, reg, filial, conta, competencia);
  return "insert";
}

export async function syncSaldosContabeis(
  tx: Omit<PrismaClient, "`$connect" | "`$disconnect" | "`$on" | "`$transaction" | "`$use" | "`$extends">,
  empresaId: string,
  registros: CanonicalSaldoContabil[]
): Promise<SyncResult> {
  logSyncStart("SaldoContabil", empresaId, registros.length);
  let criados = 0, atualizados = 0, erros = 0;

  for (const reg of registros) {
    try {
      const { filial, conta, competencia } = parseSaldoContabilExternalId(reg.externalId);
      const action = await upsertSaldoContabil(tx as PrismaClient, empresaId, { reg, filial, conta, competencia });
      if (action === "insert") criados++;
      else atualizados++;
      logSyncSuccess("SaldoContabil", reg.externalId, action);
    } catch (err) {
      erros++;
      logSyncError("SaldoContabil", reg.externalId, err);
    }
  }

  return { entidade: "SaldoContabil", processados: registros.length, criados, atualizados, erros };
}