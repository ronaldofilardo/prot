import type { PrismaClient } from "@prisma/client";
import type { CanonicalSaleItem } from "../canonical";
import { logSyncError, logSyncSkip, logSyncStart, logSyncSuccess } from "../logger";
import { parseItemVendaExternalId } from "./sync-parsers";
import { resolveClienteByExternalId } from "./sync-resolve";
import type { SyncResult } from "./sync-types";

async function upsertItemVenda(
  tx: PrismaClient,
  empresaId: string,
  reg: CanonicalSaleItem
): Promise<"update" | "insert" | "skip"> {
  const { filial, numeroNota, serie, item } = parseItemVendaExternalId(reg.externalId);
  const cliente = await resolveClienteByExternalId(tx, reg.partyExternalId, empresaId);

  if (!cliente) {
    logSyncSkip("ItemVenda", reg.externalId, "cliente nao encontrado");
    return "skip";
  }

  const existing = await tx.itemVenda.findUnique({
    where: {
      filial_numeroNota_serie_clienteId_item_empresaId: {
        filial,
        numeroNota,
        serie,
        clienteId: cliente.id,
        item,
        empresaId,
      },
    },
  });

  if (existing) {
    await tx.itemVenda.update({
      where: { id: existing.id },
      data: {
        dataEmissao: new Date(reg.issueDate),
        quantidade: reg.quantity,
        valorTotal: reg.totalAmount,
        custo: reg.costAmount,
        cfop: reg.cfop,
        tes: reg.tes,
        tipo: reg.type,
        qtdDevolvida: reg.returnedQuantity ?? 0,
        valorDevolvido: reg.returnedAmount ?? 0,
        produto: reg.productCode,
      },
    });
    return "update";
  }

  await tx.itemVenda.create({
    data: {
      filial,
      numeroNota,
      serie,
      item,
      produto: reg.productCode,
      dataEmissao: new Date(reg.issueDate),
      quantidade: reg.quantity,
      valorTotal: reg.totalAmount,
      custo: reg.costAmount,
      cfop: reg.cfop,
      tes: reg.tes,
      tipo: reg.type,
      qtdDevolvida: reg.returnedQuantity ?? 0,
      valorDevolvido: reg.returnedAmount ?? 0,
      clienteId: cliente.id,
      empresaId,
    },
  });
  return "insert";
}

export async function syncItensVenda(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalSaleItem[]
): Promise<SyncResult> {
  logSyncStart("ItemVenda", empresaId, registros.length);
  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for (const reg of registros) {
    try {
      const action = await upsertItemVenda(tx, empresaId, reg);
      if (action === "skip") {
        erros++;
        continue;
      }
      if (action === "insert") criados++;
      else atualizados++;
      logSyncSuccess("ItemVenda", reg.externalId, action);
    } catch (err) {
      erros++;
      logSyncError("ItemVenda", reg.externalId, err);
    }
  }

  return { entidade: "ItemVenda", processados: registros.length, criados, atualizados, erros };
}
