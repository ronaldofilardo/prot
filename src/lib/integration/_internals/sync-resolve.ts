import type { PrismaClient } from "@prisma/client";
import { parseClienteExternalId } from "./sync-parsers";
import { clienteKey } from "./cliente-key";

export async function resolveClienteByExternalId(
  tx: PrismaClient,
  externalId: string,
  empresaId: string
) {
  const { codigo, loja } = parseClienteExternalId(externalId);
  if (typeof tx.cliente?.findMany === "function") {
    const rows = await tx.cliente.findMany({
      where: { empresaId },
      select: { id: true, codigo: true, loja: true },
    });
    const key = clienteKey(codigo, loja);
    return rows.find((c) => clienteKey(c.codigo, c.loja) === key) ?? null;
  }
  return tx.cliente.findUnique({
    where: { codigo_loja_empresaId: { codigo, loja, empresaId } },
  });
}
