import type { PrismaClient } from "@prisma/client";
import type { CanonicalSaldoContabil } from "../canonical";
import { logSyncError, logSyncStart } from "../logger";
import { parseSaldoContabilExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";
import { diffNumbers, executeBatchCreate, executeBatchUpdate } from "./batch-upsert";

interface SaldoContabilItem {
  filial: string;
  conta: string;
  competencia: string;
  exercicio: string;
  saldoAnterior: number;
  debitos: number;
  creditos: number;
  saldoAtual: number;
  empresaId: string;
}

function montarPayloadSaldo(reg: CanonicalSaldoContabil) {
  return { saldoAnterior: reg.previousBalance, debitos: reg.debits, creditos: reg.credits, saldoAtual: reg.currentBalance, exercicio: reg.fiscalYear };
}

async function processarSaldoFallback(
  client: PrismaClient,
  empresaId: string,
  reg: CanonicalSaldoContabil
): Promise<"criado" | "atualizado"> {
  const { filial, conta, competencia } = parseSaldoContabilExternalId(reg.externalId);
  const existing = await client.saldoContabil.findUnique({
    where: { filial_conta_competencia_empresaId: { filial, conta, competencia, empresaId } },
  });
  const payload = montarPayloadSaldo(reg);
  if (existing) {
    await client.saldoContabil.update({ where: { id: existing.id }, data: payload });
    return "atualizado";
  }
  await client.saldoContabil.create({ data: { filial, conta, competencia, ...payload, empresaId } });
  return "criado";
}

async function syncSaldosFallback(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  empresaId: string,
  registros: CanonicalSaldoContabil[]
): Promise<SyncResult> {
  let criados = 0, atualizados = 0, erros = 0;
  const client = tx as PrismaClient;
  for (const reg of registros) {
    try {
      const resultado = await processarSaldoFallback(client, empresaId, reg);
      if (resultado === "criado") criados++;
      else atualizados++;
    } catch (err) {
      erros++;
      logSyncError("SaldoContabil", reg.externalId, err);
    }
  }
  return { entidade: "SaldoContabil", processados: registros.length, criados, atualizados, erros };
}

type SaldoContabilExistente = {
  id: string;
  saldoAnterior: unknown;
  debitos: unknown;
  creditos: unknown;
  saldoAtual: unknown;
  exercicio: string;
};

function saldoDiferente(existing: SaldoContabilExistente, reg: CanonicalSaldoContabil): boolean {
  return diffNumbers(existing.saldoAnterior, reg.previousBalance)
    || diffNumbers(existing.debitos, reg.debits)
    || diffNumbers(existing.creditos, reg.credits)
    || diffNumbers(existing.saldoAtual, reg.currentBalance)
    || existing.exercicio !== reg.fiscalYear;
}

interface ClassificacaoSaldos {
  paraCriar: SaldoContabilItem[];
  paraAtualizar: Array<{ id: string; data: Omit<SaldoContabilItem, "filial" | "conta" | "competencia" | "empresaId"> }>;
}

function classificarSaldos(registros: CanonicalSaldoContabil[], scMap: Map<string, SaldoContabilExistente>, empresaId: string): ClassificacaoSaldos {
  const paraCriar: SaldoContabilItem[] = [];
  const paraAtualizar: ClassificacaoSaldos["paraAtualizar"] = [];

  for (const reg of registros) {
    const { filial, conta, competencia } = parseSaldoContabilExternalId(reg.externalId);
    const existing = scMap.get(`${filial}|${conta}|${competencia}`);
    const payload = montarPayloadSaldo(reg);
    if (existing) {
      if (saldoDiferente(existing, reg)) {
        paraAtualizar.push({ id: existing.id, data: payload });
      }
    } else {
      paraCriar.push({ filial, conta, competencia, ...payload, empresaId });
    }
  }

  return { paraCriar, paraAtualizar };
}

export async function syncSaldosContabeis(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  empresaId: string,
  registros: CanonicalSaldoContabil[]
): Promise<SyncResult> {
  logSyncStart("SaldoContabil", empresaId, registros.length);
  if (registros.length === 0) return { entidade: "SaldoContabil", processados: 0, criados: 0, atualizados: 0, erros: 0 };
  const client = tx as PrismaClient;
  if (typeof client.saldoContabil?.findMany !== "function") return syncSaldosFallback(tx, empresaId, registros);

  try {
    const existentes = await client.saldoContabil.findMany({
      where: { empresaId },
      select: { id: true, filial: true, conta: true, competencia: true, saldoAnterior: true, debitos: true, creditos: true, saldoAtual: true, exercicio: true },
    });
    const scMap = new Map(existentes.map((s) => [`${s.filial}|${s.conta}|${s.competencia}`, s]));
    const { paraCriar, paraAtualizar } = classificarSaldos(registros, scMap, empresaId);
    const criados = await executeBatchCreate(client.saldoContabil, paraCriar);
    const atualizados = await executeBatchUpdate(client, paraAtualizar.map((u) => client.saldoContabil.update({ where: { id: u.id }, data: u.data })));
    return { entidade: "SaldoContabil", processados: registros.length, criados, atualizados, erros: 0 };
  } catch (err) {
    logSyncError("SaldoContabil", `batch-${empresaId}`, err);
    return syncSaldosFallback(tx, empresaId, registros);
  }
}