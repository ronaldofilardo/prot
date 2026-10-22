import type { PrismaClient } from "@prisma/client";
import type { CanonicalPayment } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart } from "../logger";
import { parseBaixaPagarExternalId, parseContaPagarExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";
import { buildContaPagarMap, executeBatchCreate } from "./batch-upsert";

interface BaixaPagarItem {
  filial: string;
  filialBaixa: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo: string;
  sequencia: string | null;
  valorBaixa: number;
  dataBaixa: Date;
  contaPagarId: string;
  empresaId: string;
}

async function syncBaixasPagarFallback(tx: PrismaClient, empresaId: string, registros: CanonicalPayment[]): Promise<SyncResult> {
  let criados = 0, erros = 0;
  for (const reg of registros) {
    try {
      const chaveConta = parseContaPagarExternalId(reg.titleExternalId);
      const contaPagar = await tx.contaPagar.findUnique({ where: { filial_prefixo_numero_parcela_tipo_fornecedorCodigo_fornecedorLoja_empresaId: { ...chaveConta, empresaId } } });
      if (!contaPagar) {
        logSyncSkip("BaixaPagar", reg.externalId, "conta a pagar nao encontrada");
        erros++;
        continue;
      }
      const { prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela } = parseBaixaPagarExternalId(reg.externalId);
      const dataBaixa = new Date(reg.paymentDate);
      const sequencia = reg.sequence ?? null;
      if (sequencia !== null) {
        const existing = await tx.baixaPagar.findUnique({ where: { contaPagarId_sequencia_dataBaixa: { contaPagarId: contaPagar.id, sequencia, dataBaixa } } });
        if (existing) continue;
      } else {
        const existing = await tx.baixaPagar.findFirst({ where: { contaPagarId: contaPagar.id, sequencia: null, dataBaixa, valorBaixa: reg.amount, empresaId } });
        if (existing) continue;
      }
      await tx.baixaPagar.create({ data: { filial: reg.branch, filialBaixa: reg.paymentBranch, prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela, tipo: reg.type, sequencia, valorBaixa: reg.amount, dataBaixa, contaPagarId: contaPagar.id, empresaId } });
      criados++;
    } catch (err) {
      erros++;
      logSyncError("BaixaPagar", reg.externalId, err);
    }
  }
  return { entidade: "BaixaPagar", processados: registros.length, criados, atualizados: 0, erros };
}

function baixaPagarDuplicada(
  sequencia: string | null,
  contaPagarId: string,
  dataBaixa: Date,
  seqMap: Set<string>,
  existentes: Array<{ contaPagarId: string; sequencia: string | null; dataBaixa: Date }>
): boolean {
  if (sequencia !== null) return seqMap.has(`${contaPagarId}|${sequencia}|${dataBaixa.toISOString()}`);
  return existentes.some((b) => b.contaPagarId === contaPagarId && b.sequencia === null && b.dataBaixa.getTime() === dataBaixa.getTime());
}

function montarItemBaixaPagar(reg: CanonicalPayment, contaPagarId: string, empresaId: string): BaixaPagarItem {
  const { prefixo, numero, parcela } = parseBaixaPagarExternalId(reg.externalId);
  return {
    filial: reg.branch,
    filialBaixa: reg.paymentBranch,
    prefixo,
    numero,
    parcela,
    tipo: reg.type,
    sequencia: reg.sequence ?? null,
    valorBaixa: reg.amount,
    dataBaixa: new Date(reg.paymentDate),
    contaPagarId,
    empresaId,
  };
}

interface ContextoBaixasPagar {
  contaMap: Map<string, string>;
  seqMap: Set<string>;
  existentes: Array<{ contaPagarId: string; sequencia: string | null; dataBaixa: Date }>;
}

async function carregarContextoBaixasPagar(tx: PrismaClient, empresaId: string): Promise<ContextoBaixasPagar> {
  const [contaMap, existentes] = await Promise.all([
    buildContaPagarMap(tx, empresaId),
    tx.baixaPagar.findMany({ where: { empresaId }, select: { id: true, contaPagarId: true, sequencia: true, dataBaixa: true, valorBaixa: true } }),
  ]);
  const seqMap = new Set(existentes.map((b) => `${b.contaPagarId}|${b.sequencia}|${b.dataBaixa.toISOString()}`));
  return { contaMap, seqMap, existentes };
}

function classificarBaixasPagar(registros: CanonicalPayment[], ctx: ContextoBaixasPagar, empresaId: string): { paraCriar: BaixaPagarItem[]; erros: number } {
  const paraCriar: BaixaPagarItem[] = [];
  let erros = 0;

  for (const reg of registros) {
    const { filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja } = parseContaPagarExternalId(reg.titleExternalId);
    const contaPagarId = ctx.contaMap.get(`${filial}|${prefixo}|${numero}|${parcela}|${tipo}|${fornecedorCodigo}|${fornecedorLoja}`);
    if (!contaPagarId) {
      logSyncSkip("BaixaPagar", reg.externalId, "conta a pagar nao encontrada");
      erros++;
      continue;
    }
    const dataBaixa = new Date(reg.paymentDate);
    const sequencia = reg.sequence ?? null;
    if (baixaPagarDuplicada(sequencia, contaPagarId, dataBaixa, ctx.seqMap, ctx.existentes)) continue;
    paraCriar.push(montarItemBaixaPagar(reg, contaPagarId, empresaId));
  }

  return { paraCriar, erros };
}

export async function syncBaixasPagar(tx: PrismaClient, empresaId: string, registros: CanonicalPayment[]): Promise<SyncResult> {
  logSyncStart("BaixaPagar", empresaId, registros.length);
  if (registros.length === 0) return { entidade: "BaixaPagar", processados: 0, criados: 0, atualizados: 0, erros: 0 };
  if (typeof tx.baixaPagar?.findMany !== "function") return syncBaixasPagarFallback(tx, empresaId, registros);

  try {
    const ctx = await carregarContextoBaixasPagar(tx, empresaId);
    const { paraCriar, erros } = classificarBaixasPagar(registros, ctx, empresaId);
    const criados = await executeBatchCreate(tx.baixaPagar, paraCriar);
    return { entidade: "BaixaPagar", processados: registros.length, criados, atualizados: 0, erros };
  } catch (err) {
    logSyncError("BaixaPagar", `batch-${empresaId}`, err);
    return syncBaixasPagarFallback(tx, empresaId, registros);
  }
}
