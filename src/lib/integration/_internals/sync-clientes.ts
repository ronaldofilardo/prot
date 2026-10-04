import type { PrismaClient } from "@prisma/client";
import type { CanonicalParty } from "../canonical";
import { logSyncError, logSyncStart, logSyncSuccess } from "../logger";
import { parseClienteExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";

async function upsertCliente(
  tx: PrismaClient,
  empresaId: string,
  payload: { reg: CanonicalParty; codigo: string; loja: string }
): Promise<"update" | "insert"> {
  const { reg, codigo, loja } = payload;
  const existing = await tx.cliente.findUnique({
    where: { codigo_loja_empresaId: { codigo, loja, empresaId } },
  });

  if (existing) {
    await tx.cliente.update({
      where: { id: existing.id },
      data: { nome: reg.name, cidade: reg.city, estado: reg.state, ativo: reg.active },
    });
    return "update";
  }

  await tx.cliente.create({
    data: { codigo, loja, nome: reg.name, cidade: reg.city, estado: reg.state, ativo: reg.active, empresaId },
  });
  return "insert";
}

export async function syncClientes(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalParty[]
): Promise<SyncResult> {
  logSyncStart("Cliente", empresaId, registros.length);
  let criados = 0, atualizados = 0, erros = 0;

  for (const reg of registros) {
    try {
      const { codigo, loja } = parseClienteExternalId(reg.externalId);
      const action = await upsertCliente(tx, empresaId, { reg, codigo, loja });
      if (action === "insert") criados++;
      else atualizados++;
      logSyncSuccess("Cliente", reg.externalId, action);
    } catch (err) {
      erros++;
      logSyncError("Cliente", reg.externalId, err);
    }
  }

  return { entidade: "Cliente", processados: registros.length, criados, atualizados, erros };
}
