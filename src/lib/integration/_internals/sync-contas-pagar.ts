import type { PrismaClient } from "@prisma/client";
import type { CanonicalPayable } from "../canonical";
import { logSyncError, logSyncStart } from "../logger";
import { parseContaPagarExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";
import { diffDates, diffNumbers, executeBatchCreate, executeBatchUpdate } from "./batch-upsert";

interface ContaPagarItem {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo: string;
  fornecedorCodigo: string;
  fornecedorLoja: string;
  fornecedorNome: string;
  dataEmissao: Date;
  vencimento: Date;
  valor: number;
  saldo: number;
  empresaId: string;
}

async function syncContasPagarFallback(tx: PrismaClient, empresaId: string, registros: CanonicalPayable[]): Promise<SyncResult> {
  let criados = 0, atualizados = 0, erros = 0;
  for (const reg of registros) {
    try {
      const { filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja } = parseContaPagarExternalId(reg.externalId);
      const existing = await tx.contaPagar.findUnique({
        where: { filial_prefixo_numero_parcela_tipo_fornecedorCodigo_fornecedorLoja_empresaId: { filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja, empresaId } },
      });
      if (existing) {
        await tx.contaPagar.update({ where: { id: existing.id }, data: { valor: reg.amount, saldo: reg.balance ?? reg.amount, vencimento: new Date(reg.dueDate), fornecedorNome: reg.supplierName, sincronizadoEm: new Date() } });
        atualizados++;
      } else {
        await tx.contaPagar.create({ data: { filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja, fornecedorNome: reg.supplierName, dataEmissao: new Date(reg.issueDate), vencimento: new Date(reg.dueDate), valor: reg.amount, saldo: reg.balance ?? reg.amount, empresaId } });
        criados++;
      }
    } catch (err) {
      erros++;
      logSyncError("ContaPagar", reg.externalId, err);
    }
  }
  return { entidade: "ContaPagar", processados: registros.length, criados, atualizados, erros };
}

export async function syncContasPagar(tx: PrismaClient, empresaId: string, registros: CanonicalPayable[]): Promise<SyncResult> {
  logSyncStart("ContaPagar", empresaId, registros.length);
  if (registros.length === 0) return { entidade: "ContaPagar", processados: 0, criados: 0, atualizados: 0, erros: 0 };
  if (typeof tx.contaPagar?.findMany !== "function") return syncContasPagarFallback(tx, empresaId, registros);

  try {
    const existentes = await tx.contaPagar.findMany({
      where: { empresaId },
      select: { id: true, filial: true, prefixo: true, numero: true, parcela: true, tipo: true, fornecedorCodigo: true, fornecedorLoja: true, valor: true, saldo: true, vencimento: true, fornecedorNome: true },
    });
    const cpMap = new Map(existentes.map((p) => [`${p.filial}|${p.prefixo}|${p.numero}|${p.parcela}|${p.tipo}|${p.fornecedorCodigo}|${p.fornecedorLoja}`, p]));
    const paraCriar: ContaPagarItem[] = [];
    const paraAtualizar: Array<{ id: string; data: { valor: number; saldo: number; vencimento: Date; fornecedorNome: string; sincronizadoEm: Date } }> = [];

    for (const reg of registros) {
      const { filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja } = parseContaPagarExternalId(reg.externalId);
      const key = `${filial}|${prefixo}|${numero}|${parcela}|${tipo}|${fornecedorCodigo}|${fornecedorLoja}`;
      const existing = cpMap.get(key);
      const saldoEsperado = reg.balance ?? reg.amount;
      if (existing) {
        if (diffNumbers(existing.valor, reg.amount) || diffNumbers(existing.saldo, saldoEsperado) || diffDates(existing.vencimento, reg.dueDate) || existing.fornecedorNome !== reg.supplierName) {
          paraAtualizar.push({ id: existing.id, data: { valor: reg.amount, saldo: saldoEsperado, vencimento: new Date(reg.dueDate), fornecedorNome: reg.supplierName, sincronizadoEm: new Date() } });
        }
      } else {
        paraCriar.push({ filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja, fornecedorNome: reg.supplierName, dataEmissao: new Date(reg.issueDate), vencimento: new Date(reg.dueDate), valor: reg.amount, saldo: saldoEsperado, empresaId });
      }
    }

    const criados = await executeBatchCreate(tx.contaPagar, paraCriar);
    const atualizados = await executeBatchUpdate(tx, paraAtualizar.map((u) => tx.contaPagar.update({ where: { id: u.id }, data: u.data })));
    return { entidade: "ContaPagar", processados: registros.length, criados, atualizados, erros: 0 };
  } catch (err) {
    logSyncError("ContaPagar", `batch-${empresaId}`, err);
    return syncContasPagarFallback(tx, empresaId, registros);
  }
}
