import type { PrismaClient } from "@prisma/client";
import type { CanonicalSaleItem } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart } from "../logger";
import { parseItemVendaExternalId, parseClienteExternalId } from "./sync-parsers";
import { resolveClienteByExternalId } from "./sync-resolve";
import type { SyncResult } from "./sync-types";
import { buildClienteMap, diffDates, diffNumbers, executeBatchCreate, executeBatchUpdate } from "./batch-upsert";

interface ItemVendaItem {
  filial: string;
  numeroNota: string;
  serie: string;
  item: string;
  produto: string;
  dataEmissao: Date;
  quantidade: number;
  valorTotal: number;
  custo: number;
  cfop: string;
  tes: string;
  tipo: string;
  qtdDevolvida: number;
  valorDevolvido: number;
  clienteId: string;
  empresaId: string;
}

async function syncItensVendaFallback(tx: PrismaClient, empresaId: string, registros: CanonicalSaleItem[]): Promise<SyncResult> {
  let criados = 0, atualizados = 0, erros = 0;
  for (const reg of registros) {
    try {
      const { filial, numeroNota, serie, item } = parseItemVendaExternalId(reg.externalId);
      const cliente = await resolveClienteByExternalId(tx, reg.partyExternalId, empresaId);
      if (!cliente) {
        logSyncSkip("ItemVenda", reg.externalId, "cliente nao encontrado");
        erros++;
        continue;
      }
      const existing = await tx.itemVenda.findUnique({
        where: { filial_numeroNota_serie_clienteId_item_empresaId: { filial, numeroNota, serie, clienteId: cliente.id, item, empresaId } },
      });
      if (existing) {
        await tx.itemVenda.update({
          where: { id: existing.id },
          data: { dataEmissao: new Date(reg.issueDate), quantidade: reg.quantity, valorTotal: reg.totalAmount, custo: reg.costAmount, cfop: reg.cfop, tes: reg.tes, tipo: reg.type, qtdDevolvida: reg.returnedQuantity ?? 0, valorDevolvido: reg.returnedAmount ?? 0, produto: reg.productCode },
        });
        atualizados++;
      } else {
        await tx.itemVenda.create({
          data: { filial, numeroNota, serie, item, produto: reg.productCode, dataEmissao: new Date(reg.issueDate), quantidade: reg.quantity, valorTotal: reg.totalAmount, custo: reg.costAmount, cfop: reg.cfop, tes: reg.tes, tipo: reg.type, qtdDevolvida: reg.returnedQuantity ?? 0, valorDevolvido: reg.returnedAmount ?? 0, clienteId: cliente.id, empresaId },
        });
        criados++;
      }
    } catch (err) {
      erros++;
      logSyncError("ItemVenda", reg.externalId, err);
    }
  }
  return { entidade: "ItemVenda", processados: registros.length, criados, atualizados, erros };
}

export async function syncItensVenda(tx: PrismaClient, empresaId: string, registros: CanonicalSaleItem[]): Promise<SyncResult> {
  logSyncStart("ItemVenda", empresaId, registros.length);
  if (registros.length === 0) return { entidade: "ItemVenda", processados: 0, criados: 0, atualizados: 0, erros: 0 };
  if (typeof tx.itemVenda?.findMany !== "function") return syncItensVendaFallback(tx, empresaId, registros);

  try {
    const [clienteMap, existentes] = await Promise.all([
      buildClienteMap(tx, empresaId),
      tx.itemVenda.findMany({ where: { empresaId }, select: { id: true, filial: true, numeroNota: true, serie: true, clienteId: true, item: true, quantidade: true, valorTotal: true, custo: true, cfop: true, tes: true, tipo: true, qtdDevolvida: true, valorDevolvido: true, produto: true, dataEmissao: true } }),
    ]);
    const itMap = new Map(existentes.map((i) => [`${i.filial}|${i.numeroNota}|${i.serie}|${i.clienteId}|${i.item}`, i]));
    const paraCriar: ItemVendaItem[] = [];
    const paraAtualizar: Array<{ id: string; data: Omit<ItemVendaItem, "filial" | "numeroNota" | "serie" | "clienteId" | "item" | "empresaId"> }> = [];
    let erros = 0;

    for (const reg of registros) {
      const { filial, numeroNota, serie, item } = parseItemVendaExternalId(reg.externalId);
      const { codigo, loja } = parseClienteExternalId(reg.partyExternalId);
      const clienteId = clienteMap.get(`${codigo}|${loja}`);
      if (!clienteId) {
        logSyncSkip("ItemVenda", reg.externalId, "cliente nao encontrado");
        erros++;
        continue;
      }
      const existing = itMap.get(`${filial}|${numeroNota}|${serie}|${clienteId}|${item}`);
      const payload = { dataEmissao: new Date(reg.issueDate), quantidade: reg.quantity, valorTotal: reg.totalAmount, custo: reg.costAmount, cfop: reg.cfop, tes: reg.tes, tipo: reg.type, qtdDevolvida: reg.returnedQuantity ?? 0, valorDevolvido: reg.returnedAmount ?? 0, produto: reg.productCode };
      if (existing) {
        if (diffNumbers(existing.valorTotal, reg.totalAmount) || diffNumbers(existing.quantidade, reg.quantity) || diffNumbers(existing.custo, reg.costAmount) || diffDates(existing.dataEmissao, reg.issueDate) || existing.produto !== reg.productCode) {
          paraAtualizar.push({ id: existing.id, data: payload });
        }
      } else {
        paraCriar.push({ filial, numeroNota, serie, item, ...payload, clienteId, empresaId });
      }
    }

    const criados = await executeBatchCreate(tx.itemVenda, paraCriar);
    const atualizados = await executeBatchUpdate(tx, paraAtualizar.map((u) => tx.itemVenda.update({ where: { id: u.id }, data: u.data })));
    return { entidade: "ItemVenda", processados: registros.length, criados, atualizados, erros };
  } catch (err) {
    logSyncError("ItemVenda", `batch-${empresaId}`, err);
    return syncItensVendaFallback(tx, empresaId, registros);
  }
}
