import type { PrismaClient } from "@prisma/client";
import type { CanonicalPayment } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart } from "../logger";
import { parseBaixaExternalId, parseContaReceberExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";
import { buildContaReceberMap, executeBatchCreate, executeBatchUpdate } from "./batch-upsert";

type BaixaItem = { filial: string; filialBaixa: string; prefixo: string; numero: string; parcela: string; tipo: string; sequencia: string | null; valorBaixa: number; dataBaixa: Date; contaReceberId: string; empresaId: string };

type BaixaExistente = {
  id: string;
  contaReceberId: string;
  sequencia: string | null;
  dataBaixa: Date;
  prefixo: string;
  numero: string;
  parcela: string;
};

type ChavesBaixa = { prefixo: string; numero: string; parcela: string };
type ResultadoBaixaFallback = "criada" | "atualizada" | "ignorada" | "erro";
type EstadoBaixaFallback = "nao-existe" | "ja-existe" | "legada-atualizada";

async function buscarContaReceberFallback(
  tx: PrismaClient,
  chaves: { filial: string; prefixo: string; numero: string; parcela: string; tipo: string },
  empresaId: string
) {
  const encontrada = await tx.contaReceber
    .findUnique({ where: { filial_prefixo_numero_parcela_tipo_empresaId: { ...chaves, empresaId } } })
    .catch(() => null);
  if (encontrada) return encontrada;
  const { filial, prefixo, numero, parcela } = chaves;
  return tx.contaReceber.findFirst({ where: { filial, prefixo, numero, parcela, empresaId } });
}

async function resolverBaixaExistente(
  tx: PrismaClient,
  contaReceberId: string,
  reg: CanonicalPayment,
  bx: ChavesBaixa,
  dataBaixa: Date,
  empresaId: string
): Promise<EstadoBaixaFallback> {
  const sequencia = reg.sequence ?? null;
  if (sequencia !== null) {
    const existing = await tx.baixa.findUnique({ where: { contaReceberId_sequencia_dataBaixa: { contaReceberId, sequencia, dataBaixa } } });
    if (existing) return "ja-existe";
    const legacy = await tx.baixa.findFirst({ where: { contaReceberId, sequencia: null, dataBaixa, valorBaixa: reg.amount, empresaId } });
    if (legacy) {
      await tx.baixa.update({ where: { id: legacy.id }, data: { sequencia } });
      return "legada-atualizada";
    }
    return "nao-existe";
  }
  const existing = await tx.baixa.findFirst({ where: { contaReceberId, prefixo: bx.prefixo, numero: bx.numero, parcela: bx.parcela, dataBaixa, empresaId } });
  if (existing) return "ja-existe";
  return "nao-existe";
}

async function processarBaixaFallback(tx: PrismaClient, empresaId: string, reg: CanonicalPayment): Promise<ResultadoBaixaFallback> {
  const { filial, prefixo, numero, parcela, tipo: parsedTipo } = parseContaReceberExternalId(reg.titleExternalId);
  const tipo = reg.type || parsedTipo || "NF";
  const contaReceber = await buscarContaReceberFallback(tx, { filial, prefixo, numero, parcela, tipo }, empresaId);
  if (!contaReceber) {
    logSyncSkip("Baixa", reg.externalId, "conta a receber nao encontrada");
    return "erro";
  }
  const bx = parseBaixaExternalId(reg.externalId);
  const dataBaixa = new Date(reg.paymentDate);
  const estado = await resolverBaixaExistente(tx, contaReceber.id, reg, bx, dataBaixa, empresaId);
  if (estado === "ja-existe") return "ignorada";
  if (estado === "legada-atualizada") return "atualizada";
  await tx.baixa.create({ data: { filial: reg.branch, filialBaixa: reg.paymentBranch, prefixo: bx.prefixo, numero: bx.numero, parcela: bx.parcela, tipo: reg.type, sequencia: reg.sequence ?? null, valorBaixa: reg.amount, dataBaixa, contaReceberId: contaReceber.id, empresaId } });
  return "criada";
}

async function syncBaixasFallback(tx: PrismaClient, empresaId: string, registros: CanonicalPayment[]): Promise<SyncResult> {
  let criados = 0, atualizados = 0, erros = 0;
  for (const reg of registros) {
    try {
      const resultado = await processarBaixaFallback(tx, empresaId, reg);
      if (resultado === "criada") criados++;
      else if (resultado === "atualizada") atualizados++;
      else if (resultado === "erro") erros++;
    } catch (err) {
      erros++;
      logSyncError("Baixa", reg.externalId, err);
    }
  }
  return { entidade: "Baixa", processados: registros.length, criados, atualizados, erros };
}

function acharBaixaLegada(existentes: BaixaExistente[], contaReceberId: string, dataBaixa: Date): BaixaExistente | undefined {
  return existentes.find((b) => b.contaReceberId === contaReceberId && b.sequencia === null && b.dataBaixa.getTime() === dataBaixa.getTime());
}

function existeBaixaSemSequencia(existentes: BaixaExistente[], contaReceberId: string, bx: ChavesBaixa, dataBaixa: Date): boolean {
  return existentes.some((b) => b.contaReceberId === contaReceberId && b.prefixo === bx.prefixo && b.numero === bx.numero && b.parcela === bx.parcela && b.dataBaixa.getTime() === dataBaixa.getTime());
}

interface ClassificacaoBaixa {
  paraCriar: BaixaItem[];
  paraAtualizar: Array<{ id: string; sequencia: string }>;
  erros: number;
}

interface ContextoBaixas {
  contaMap: Map<string, string>;
  existentes: BaixaExistente[];
  seqMap: Set<string>;
  empresaId: string;
}

type AcaoBaixa =
  | { tipo: "criar"; bx: ChavesBaixa; dataBaixa: Date; sequencia: string | null }
  | { tipo: "existe" }
  | { tipo: "atualizar"; id: string; sequencia: string };

function resolverContaReceber(reg: CanonicalPayment, contaMap: Map<string, string>): string | undefined {
  const { filial, prefixo, numero, parcela, tipo: parsedTipo } = parseContaReceberExternalId(reg.titleExternalId);
  const tipo = reg.type || parsedTipo || "NF";
  return contaMap.get(`${filial}|${prefixo}|${numero}|${parcela}|${tipo}`)
    ?? contaMap.get(`${filial}|${prefixo}|${numero}|${parcela}`);
}

function resolverAcaoBaixa(reg: CanonicalPayment, ctx: ContextoBaixas, contaReceberId: string): AcaoBaixa {
  const bx = parseBaixaExternalId(reg.externalId);
  const dataBaixa = new Date(reg.paymentDate);
  const sequencia = reg.sequence ?? null;
  if (sequencia !== null) {
    if (ctx.seqMap.has(`${contaReceberId}|${sequencia}|${dataBaixa.toISOString()}`)) return { tipo: "existe" };
    const legacy = acharBaixaLegada(ctx.existentes, contaReceberId, dataBaixa);
    if (legacy) return { tipo: "atualizar", id: legacy.id, sequencia };
  } else if (existeBaixaSemSequencia(ctx.existentes, contaReceberId, bx, dataBaixa)) {
    return { tipo: "existe" };
  }
  return { tipo: "criar", bx, dataBaixa, sequencia };
}

function montarBaixaItem(reg: CanonicalPayment, ctx: ContextoBaixas, contaReceberId: string, acao: Extract<AcaoBaixa, { tipo: "criar" }>): BaixaItem {
  return { filial: reg.branch, filialBaixa: reg.paymentBranch, prefixo: acao.bx.prefixo, numero: acao.bx.numero, parcela: acao.bx.parcela, tipo: reg.type, sequencia: acao.sequencia, valorBaixa: reg.amount, dataBaixa: acao.dataBaixa, contaReceberId, empresaId: ctx.empresaId };
}

function classificarBaixas(registros: CanonicalPayment[], ctx: ContextoBaixas): ClassificacaoBaixa {
  const paraCriar: BaixaItem[] = [];
  const paraAtualizar: Array<{ id: string; sequencia: string }> = [];
  let erros = 0;

  for (const reg of registros) {
    const contaReceberId = resolverContaReceber(reg, ctx.contaMap);
    if (!contaReceberId) {
      logSyncSkip("Baixa", reg.externalId, "conta a receber nao encontrada");
      erros++;
      continue;
    }
    const acao = resolverAcaoBaixa(reg, ctx, contaReceberId);
    if (acao.tipo === "existe") continue;
    if (acao.tipo === "atualizar") {
      paraAtualizar.push({ id: acao.id, sequencia: acao.sequencia });
      continue;
    }
    paraCriar.push(montarBaixaItem(reg, ctx, contaReceberId, acao));
  }

  return { paraCriar, paraAtualizar, erros };
}

export async function syncBaixas(tx: PrismaClient, empresaId: string, registros: CanonicalPayment[]): Promise<SyncResult> {
  logSyncStart("Baixa", empresaId, registros.length);
  if (registros.length === 0) return { entidade: "Baixa", processados: 0, criados: 0, atualizados: 0, erros: 0 };
  if (typeof tx.baixa?.findMany !== "function") return syncBaixasFallback(tx, empresaId, registros);

  try {
    const [contaMap, existentes] = await Promise.all([
      buildContaReceberMap(tx, empresaId),
      tx.baixa.findMany({ where: { empresaId }, select: { id: true, contaReceberId: true, sequencia: true, dataBaixa: true, prefixo: true, numero: true, parcela: true, valorBaixa: true } }),
    ]);
    const seqMap = new Set(existentes.map((b) => `${b.contaReceberId}|${b.sequencia}|${b.dataBaixa.toISOString()}`));
    const { paraCriar, paraAtualizar, erros } = classificarBaixas(registros, { contaMap, existentes, seqMap, empresaId });

    const criados = await executeBatchCreate(tx.baixa, paraCriar);
    const atualizados = await executeBatchUpdate(tx, paraAtualizar.map((u) => tx.baixa.update({ where: { id: u.id }, data: { sequencia: u.sequencia } })));
    return { entidade: "Baixa", processados: registros.length, criados, atualizados, erros };
  } catch (err) {
    logSyncError("Baixa", `batch-${empresaId}`, err);
    return syncBaixasFallback(tx, empresaId, registros);
  }
}
