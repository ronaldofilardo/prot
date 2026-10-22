import type { PrismaClient } from "@prisma/client";
import type { CanonicalInvoice } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart } from "../logger";
import { parseFaturamentoExternalId, parseClienteExternalId } from "./sync-parsers";
import { resolveClienteByExternalId } from "./sync-resolve";
import type { SyncResult } from "./sync-types";
import { buildClienteMap, diffDates, diffNumbers, executeBatchCreate, executeBatchUpdate } from "./batch-upsert";
import { clienteKey } from "./cliente-key";

interface FaturamentoItem {
  filial: string;
  numeroNota: string;
  serie: string;
  dataEmissao: Date;
  valorTotal: number;
  clienteId: string;
  empresaId: string;
}

type FaturamentoExistente = { id: string; valorTotal: unknown; dataEmissao: Date | string | null };
type FaturamentoMap = Map<string, FaturamentoExistente>;

interface ClassificacaoFaturamento {
  paraCriar: FaturamentoItem[];
  paraAtualizar: Array<{ id: string; data: { valorTotal: number; dataEmissao: Date } }>;
  erros: number;
}

function atualizacaoNotaSeNecessaria(existing: FaturamentoExistente, reg: CanonicalInvoice) {
  if (diffNumbers(existing.valorTotal, reg.amount) || diffDates(existing.dataEmissao, reg.issueDate)) {
    return { valorTotal: reg.amount, dataEmissao: new Date(reg.issueDate) };
  }
  return null;
}

function montarNotaFaturamento(reg: CanonicalInvoice, clienteId: string, empresaId: string): FaturamentoItem {
  const { filial, numeroNota, serie } = parseFaturamentoExternalId(reg.externalId);
  const serieNota = reg.series ?? serie ?? "";
  return { filial, numeroNota, serie: serieNota, dataEmissao: new Date(reg.issueDate), valorTotal: reg.amount, clienteId, empresaId };
}

function classificarNotas(registros: CanonicalInvoice[], fatMap: FaturamentoMap, clienteMap: Map<string, string>, empresaId: string): ClassificacaoFaturamento {
  const paraCriar: FaturamentoItem[] = [];
  const paraAtualizar: Array<{ id: string; data: { valorTotal: number; dataEmissao: Date } }> = [];
  let erros = 0;

  for (const reg of registros) {
    const { filial, numeroNota, serie } = parseFaturamentoExternalId(reg.externalId);
    const serieNota = reg.series ?? serie ?? "";
    const existing = fatMap.get(`${filial}|${numeroNota}|${serieNota}`);
    if (existing) {
      const data = atualizacaoNotaSeNecessaria(existing, reg);
      if (data) paraAtualizar.push({ id: existing.id, data });
      continue;
    }
    const { codigo, loja } = parseClienteExternalId(reg.partyExternalId);
    const clienteId = clienteMap.get(clienteKey(codigo, loja));
    if (!clienteId) {
      logSyncSkip("Faturamento", reg.externalId, `cliente nao encontrado (party=${reg.partyExternalId}, mapa=${clienteMap.size})`);
      erros++;
      continue;
    }
    paraCriar.push(montarNotaFaturamento(reg, clienteId, empresaId));
  }

  return { paraCriar, paraAtualizar, erros };
}

async function syncFaturamentosFallback(tx: PrismaClient, empresaId: string, registros: CanonicalInvoice[]): Promise<SyncResult> {
  let criados = 0, atualizados = 0, erros = 0;
  for (const reg of registros) {
    try {
      const { filial, numeroNota, serie } = parseFaturamentoExternalId(reg.externalId);
      const serieNota = reg.series ?? serie ?? "";
      const existing = await tx.faturamento.findUnique({ where: { filial_numeroNota_serie_empresaId: { filial, numeroNota, serie: serieNota, empresaId } } });
      if (existing) {
        await tx.faturamento.update({ where: { id: existing.id }, data: { valorTotal: reg.amount, dataEmissao: new Date(reg.issueDate) } });
        atualizados++;
        continue;
      }
      const cliente = await resolveClienteByExternalId(tx, reg.partyExternalId, empresaId);
      if (!cliente) {
        logSyncSkip("Faturamento", reg.externalId, `cliente nao encontrado (party=${reg.partyExternalId})`);
        erros++;
        continue;
      }
      await tx.faturamento.create({ data: { filial, numeroNota, serie: serieNota, dataEmissao: new Date(reg.issueDate), valorTotal: reg.amount, clienteId: cliente.id, empresaId } });
      criados++;
    } catch (err) {
      erros++;
      logSyncError("Faturamento", reg.externalId, err);
    }
  }
  return { entidade: "Faturamento", processados: registros.length, criados, atualizados, erros };
}

export async function syncFaturamentos(tx: PrismaClient, empresaId: string, registros: CanonicalInvoice[]): Promise<SyncResult> {
  logSyncStart("Faturamento", empresaId, registros.length);
  if (registros.length === 0) return { entidade: "Faturamento", processados: 0, criados: 0, atualizados: 0, erros: 0 };
  if (typeof tx.faturamento?.findMany !== "function") return syncFaturamentosFallback(tx, empresaId, registros);

  try {
    const [clienteMap, existentes] = await Promise.all([
      buildClienteMap(tx, empresaId),
      tx.faturamento.findMany({ where: { empresaId }, select: { id: true, filial: true, numeroNota: true, serie: true, valorTotal: true, dataEmissao: true } }),
    ]);
    const fatMap: FaturamentoMap = new Map(existentes.map((f) => [`${f.filial}|${f.numeroNota}|${f.serie ?? ""}`, f]));
    const { paraCriar, paraAtualizar, erros } = classificarNotas(registros, fatMap, clienteMap, empresaId);

    const criados = await executeBatchCreate(tx.faturamento, paraCriar);
    const atualizados = await executeBatchUpdate(tx, paraAtualizar.map((u) => tx.faturamento.update({ where: { id: u.id }, data: u.data })));
    return { entidade: "Faturamento", processados: registros.length, criados, atualizados, erros };
  } catch (err) {
    logSyncError("Faturamento", `batch-${empresaId}`, err);
    return syncFaturamentosFallback(tx, empresaId, registros);
  }
}
