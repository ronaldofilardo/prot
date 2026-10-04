import type { PrismaClient } from "@prisma/client";
import { parseClienteExternalId } from "./sync-parsers";

export async function resolveClienteByExternalId(
  tx: PrismaClient,
  externalId: string,
  empresaId: string
) {
  const { codigo, loja } = parseClienteExternalId(externalId);
  return tx.cliente.findUnique({
    where: { codigo_loja_empresaId: { codigo, loja, empresaId } },
  });
}
