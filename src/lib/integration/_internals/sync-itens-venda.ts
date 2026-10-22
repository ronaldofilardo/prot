import type { PrismaClient } from "@prisma/client";
import type { CanonicalSaleItem } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart } from "../logger";
import { parseItemVendaExternalId, parseClienteExternalId } from "./sync-parsers";
import { resolveClienteByExternalId } from "./sync-resolve";
import type { SyncResult } from "./sync-types";
import { buildClienteMap, diffDates, diffNumbers, executeBatchCreate, executeBatchUpdate } from "./batch-upsert";
import { clienteKey } from "./cliente-key";

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

type ItemVendaPayload = Omit<ItemVendaItem, "filial" | "numeroNota" | "serie" | "clienteId" | "item" | "empresaId">;
type ItemVendaExistente = {
  id: string;
  dataEmissao?: Date | string | null;
  produto?: unknown;
  valorTotal?: unknown;
  quantidade?: unknown;
  custo?: unknown;
};
type ItemVendaMap = Map<string, ItemVendaExistente>;

interface ClassificacaoItemVenda {
  paraCriar: ItemVendaItem[];
  paraAtualizar: Array<{ id: string; data: ItemVendaPayload }>;
  erros: number;
}

function montarPayloadItem(reg: CanonicalSaleItem): ItemVendaPayload {
  return { dataEmissao: new Date(reg.issueDate), quantidade: reg.quantity, valorTotal: reg.totalAmount, custo: reg.costAmount, cfop: reg.cfop, tes: reg.tes, tipo: reg.type, qtdDevolvida: reg.returnedQuantity ?? 0, valorDevolvido: reg.returnedAmount ?? 0, produto: reg.productCode };
}

function itemDiferente(existing: ItemVendaExistente, payload: ItemVendaPayload): boolean {
  return diffNumbers(existing.valorTotal, payload.valorTotal) || diffNumbers(existing.quantidade, payload.quantidade) || diffNumbers(existing.custo, payload.custo) || diffDates(existing.dataEmissao, payload.dataEmissao) || existing.produto !== payload.produto;
}

function classificarItens(registros: CanonicalSaleItem[], itMap: ItemVendaMap, clienteMap: Map<string, string>, empresaId: string): ClassificacaoItemVenda {
  const paraCriar: ItemVendaItem[] = [];
  const paraAtualizar: Array<{ id: string; data: ItemVendaPayload }> = [];
  let erros = 0;

  for (const reg of registros) {
    const { filial, numeroNota, serie, item } = parseItemVendaExternalId(reg.externalId);
    const { codigo, loja } = parseClienteExternalId(reg.partyExternalId);
    const clienteId = clienteMap.get(clienteKey(codigo, loja));
    if (!clienteId) {
      logSyncSkip("ItemVenda", reg.externalId, `cliente nao encontrado (party=${reg.partyExternalId}, mapa=${clienteMap.size})`);
      erros++;
      continue;
    }
    const existing = itMap.get(`${filial}|${numeroNota}|${serie}|${clienteId}|${item}`);
    const payload = montarPayloadItem(reg);
    if (existing) {
      if (itemDiferente(existing, payload)) paraAtualizar.push({ id: existing.id, data: payload });
    } else {
      paraCriar.push({ filial, numeroNota, serie, item, ...payload, clienteId, empresaId });
    }
  }

  return { paraCriar, paraAtualizar, erros };
}

type ResultadoItemFallback = "criado" | "atualizado" | "erro";

async function processarItemFallback(tx: PrismaClient, empresaId: string, reg: CanonicalSaleItem): Promise<ResultadoItemFallback> {
  const { filial, numeroNota, serie, item } = parseItemVendaExternalId(reg.externalId);
  const cliente = await resolveClienteByExternalId(tx, reg.partyExternalId, empresaId);
  if (!cliente) {
    logSyncSkip("ItemVenda", reg.externalId, `cliente nao encontrado (party=${reg.partyExternalId})`);
    return "erro";
  }
  const payload = montarPayloadItem(reg);
  const existing = await tx.itemVenda.findUnique({
    where: { filial_numeroNota_serie_clienteId_item_empresaId: { filial, numeroNota, serie, clienteId: cliente.id, item, empresaId } },
  });
  if (existing) {
    await tx.itemVenda.update({ where: { id: existing.id }, data: payload });
    return "atualizado";
  }
  await tx.itemVenda.create({ data: { filial, numeroNota, serie, item, ...payload, clienteId: cliente.id, empresaId } });
  return "criado";
}

async function syncItensVendaFallback(tx: PrismaClient, empresaId: string, registros: CanonicalSaleItem[]): Promise<SyncResult> {
  let criados = 0, atualizados = 0, erros = 0;
  for (const reg of registros) {
    try {
      const resultado = await processarItemFallback(tx, empresaId, reg);
      if (resultado === "criado") criados++;
      else if (resultado === "atualizado") atualizados++;
      else erros++;
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
    const itMap: ItemVendaMap = new Map(existentes.map((i) => [`${i.filial}|${i.numeroNota}|${i.serie}|${i.clienteId}|${i.item}`, i]));
    const { paraCriar, paraAtualizar, erros } = classificarItens(registros, itMap, clienteMap, empresaId);

    const criados = await executeBatchCreate(tx.itemVenda, paraCriar);
    const atualizados = await executeBatchUpdate(tx, paraAtualizar.map((u) => tx.itemVenda.update({ where: { id: u.id }, data: u.data })));
    return { entidade: "ItemVenda", processados: registros.length, criados, atualizados, erros };
  } catch (err) {
    logSyncError("ItemVenda", `batch-${empresaId}`, err);
    return syncItensVendaFallback(tx, empresaId, registros);
  }
}
