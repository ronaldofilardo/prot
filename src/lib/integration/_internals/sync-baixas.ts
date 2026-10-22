import type { PrismaClient } from "@prisma/client";
import type { CanonicalPayment } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart } from "../logger";
import { parseBaixaExternalId, parseContaReceberExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";
import { buildContaReceberMap, executeBatchCreate, executeBatchUpdate } from "./batch-upsert";

type BaixaItem = { filial: string; filialBaixa: string; prefixo: string; numero: string; parcela: string; tipo: string; sequencia: string | null; valorBaixa: number; dataBaixa: Date; contaReceberId: string; empresaId: string };

async function syncBaixasFallback(tx: PrismaClient, empresaId: string, registros: CanonicalPayment[]): Promise<SyncResult> {
  let criados = 0, atualizados = 0, erros = 0;
  for (const reg of registros) {
    try {
      const { filial, prefixo, numero, parcela, tipo: parsedTipo } = parseContaReceberExternalId(reg.titleExternalId);
      const tipo = reg.type || parsedTipo || "NF";
      const contaReceber = await tx.contaReceber.findUnique({
        where: { filial_prefixo_numero_parcela_tipo_empresaId: { filial, prefixo, numero, parcela, tipo, empresaId } }
      }).catch(() => null) ?? await tx.contaReceber.findFirst({ where: { filial, prefixo, numero, parcela, empresaId } });
      if (!contaReceber) {
        logSyncSkip("Baixa", reg.externalId, "conta a receber nao encontrada");
        erros++;
        continue;
      }
      const { prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela } = parseBaixaExternalId(reg.externalId);
      const dataBaixa = new Date(reg.paymentDate);
      const sequencia = reg.sequence ?? null;
      if (sequencia !== null) {
        const existing = await tx.baixa.findUnique({ where: { contaReceberId_sequencia_dataBaixa: { contaReceberId: contaReceber.id, sequencia, dataBaixa } } });
        if (existing) continue;
        const legacy = await tx.baixa.findFirst({ where: { contaReceberId: contaReceber.id, sequencia: null, dataBaixa, valorBaixa: reg.amount, empresaId } });
        if (legacy) {
          await tx.baixa.update({ where: { id: legacy.id }, data: { sequencia } });
          atualizados++;
          continue;
        }
      } else {
        const existing = await tx.baixa.findFirst({ where: { contaReceberId: contaReceber.id, prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela, dataBaixa, empresaId } });
        if (existing) continue;
      }
      await tx.baixa.create({ data: { filial: reg.branch, filialBaixa: reg.paymentBranch, prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela, tipo: reg.type, sequencia, valorBaixa: reg.amount, dataBaixa, contaReceberId: contaReceber.id, empresaId } });
      criados++;
    } catch (err) {
      erros++;
      logSyncError("Baixa", reg.externalId, err);
    }
  }
  return { entidade: "Baixa", processados: registros.length, criados, atualizados, erros };
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
    const seqMap = new Map(existentes.map((b) => [`${b.contaReceberId}|${b.sequencia}|${b.dataBaixa.toISOString()}`, b]));
    const paraCriar: BaixaItem[] = [];
    const paraAtualizar: Array<{ id: string; sequencia: string }> = [];
    let erros = 0;

    for (const reg of registros) {
      const { filial, prefixo, numero, parcela, tipo: parsedTipo } = parseContaReceberExternalId(reg.titleExternalId);
      const tipo = reg.type || parsedTipo || "NF";
      const contaReceberId = contaMap.get(`${filial}|${prefixo}|${numero}|${parcela}|${tipo}`)
        ?? contaMap.get(`${filial}|${prefixo}|${numero}|${parcela}`);
      if (!contaReceberId) {
        logSyncSkip("Baixa", reg.externalId, "conta a receber nao encontrada");
        erros++;
        continue;
      }
      const { prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela } = parseBaixaExternalId(reg.externalId);
      const dataBaixa = new Date(reg.paymentDate);
      const sequencia = reg.sequence ?? null;
      if (sequencia !== null) {
        if (seqMap.has(`${contaReceberId}|${sequencia}|${dataBaixa.toISOString()}`)) continue;
        const legacy = existentes.find((b) => b.contaReceberId === contaReceberId && b.sequencia === null && b.dataBaixa.getTime() === dataBaixa.getTime());
        if (legacy) {
          paraAtualizar.push({ id: legacy.id, sequencia });
          continue;
        }
      } else if (existentes.some((b) => b.contaReceberId === contaReceberId && b.prefixo === bxPrefixo && b.numero === bxNumero && b.parcela === bxParcela && b.dataBaixa.getTime() === dataBaixa.getTime())) {
        continue;
      }
      paraCriar.push({ filial: reg.branch, filialBaixa: reg.paymentBranch, prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela, tipo: reg.type, sequencia, valorBaixa: reg.amount, dataBaixa, contaReceberId, empresaId });
    }

    const criados = await executeBatchCreate(tx.baixa, paraCriar);
    const atualizados = await executeBatchUpdate(tx, paraAtualizar.map((u) => tx.baixa.update({ where: { id: u.id }, data: { sequencia: u.sequencia } })));
    return { entidade: "Baixa", processados: registros.length, criados, atualizados, erros };
  } catch (err) {
    logSyncError("Baixa", `batch-${empresaId}`, err);
    return syncBaixasFallback(tx, empresaId, registros);
  }
}
