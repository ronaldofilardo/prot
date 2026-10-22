import type { PrismaClient } from "@prisma/client";
import type { CanonicalTitle } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart } from "../logger";
import { parseContaReceberExternalId, parseClienteExternalId } from "./sync-parsers";
import { resolveClienteByExternalId } from "./sync-resolve";
import type { SyncResult } from "./sync-types";
import { buildClienteMap, diffDates, diffNumbers, executeBatchCreate, executeBatchUpdate } from "./batch-upsert";

interface ContaReceberItem {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo: string;
  dataEmissao: Date;
  vencimento: Date;
  valor: number;
  saldo: number;
  clienteId: string;
  empresaId: string;
}

async function syncContasReceberFallback(tx: PrismaClient, empresaId: string, registros: CanonicalTitle[]): Promise<SyncResult> {
  let criados = 0, atualizados = 0, erros = 0;
  for (const reg of registros) {
    try {
      const { filial, prefixo, numero, parcela, tipo: parsedTipo } = parseContaReceberExternalId(reg.externalId);
      const tipo = reg.type || parsedTipo || "NF";
      const existing = await tx.contaReceber.findUnique({ where: { filial_prefixo_numero_parcela_tipo_empresaId: { filial, prefixo, numero, parcela, tipo, empresaId } } });
      if (existing) {
        await tx.contaReceber.update({ where: { id: existing.id }, data: { valor: reg.amount, saldo: reg.balance ?? reg.amount, vencimento: new Date(reg.dueDate) } });
        atualizados++;
        continue;
      }
      const cliente = await resolveClienteByExternalId(tx, reg.partyExternalId, empresaId);
      if (!cliente) {
        logSyncSkip("ContaReceber", reg.externalId, "cliente nao encontrado");
        erros++;
        continue;
      }
      await tx.contaReceber.create({ data: { filial, prefixo, numero, parcela, tipo, dataEmissao: new Date(reg.issueDate), vencimento: new Date(reg.dueDate), valor: reg.amount, saldo: reg.balance ?? reg.amount, clienteId: cliente.id, empresaId } });
      criados++;
    } catch (err) {
      erros++;
      logSyncError("ContaReceber", reg.externalId, err);
    }
  }
  return { entidade: "ContaReceber", processados: registros.length, criados, atualizados, erros };
}

export async function syncContasReceber(tx: PrismaClient, empresaId: string, registros: CanonicalTitle[]): Promise<SyncResult> {
  logSyncStart("ContaReceber", empresaId, registros.length);
  if (registros.length === 0) return { entidade: "ContaReceber", processados: 0, criados: 0, atualizados: 0, erros: 0 };
  if (typeof tx.contaReceber?.findMany !== "function") return syncContasReceberFallback(tx, empresaId, registros);

  try {
    const [clienteMap, existentes] = await Promise.all([
      buildClienteMap(tx, empresaId),
      tx.contaReceber.findMany({ where: { empresaId }, select: { id: true, filial: true, prefixo: true, numero: true, parcela: true, tipo: true, valor: true, saldo: true, vencimento: true } }),
    ]);
    const crMap = new Map(existentes.map((c) => [`${c.filial}|${c.prefixo}|${c.numero}|${c.parcela}|${c.tipo}`, c]));
    const paraCriar: ContaReceberItem[] = [];
    const paraAtualizar: Array<{ id: string; data: { valor: number; saldo: number; vencimento: Date } }> = [];
    let erros = 0;

    for (const reg of registros) {
      const { filial, prefixo, numero, parcela, tipo: parsedTipo } = parseContaReceberExternalId(reg.externalId);
      const tipo = reg.type || parsedTipo || "NF";
      const existing = crMap.get(`${filial}|${prefixo}|${numero}|${parcela}|${tipo}`);
      if (existing) {
        const saldoEsperado = reg.balance ?? reg.amount;
        if (diffNumbers(existing.valor, reg.amount) || diffNumbers(existing.saldo, saldoEsperado) || diffDates(existing.vencimento, reg.dueDate)) {
          paraAtualizar.push({ id: existing.id, data: { valor: reg.amount, saldo: saldoEsperado, vencimento: new Date(reg.dueDate) } });
        }
        continue;
      }
      const { codigo, loja } = parseClienteExternalId(reg.partyExternalId);
      const clienteId = clienteMap.get(`${codigo}|${loja}`);
      if (!clienteId) {
        logSyncSkip("ContaReceber", reg.externalId, "cliente nao encontrado");
        erros++;
        continue;
      }
      paraCriar.push({ filial, prefixo, numero, parcela, tipo, dataEmissao: new Date(reg.issueDate), vencimento: new Date(reg.dueDate), valor: reg.amount, saldo: reg.balance ?? reg.amount, clienteId, empresaId });
    }

    const criados = await executeBatchCreate(tx.contaReceber, paraCriar);
    const atualizados = await executeBatchUpdate(tx, paraAtualizar.map((u) => tx.contaReceber.update({ where: { id: u.id }, data: u.data })));
    return { entidade: "ContaReceber", processados: registros.length, criados, atualizados, erros };
  } catch (err) {
    logSyncError("ContaReceber", `batch-${empresaId}`, err);
    return syncContasReceberFallback(tx, empresaId, registros);
  }
}
