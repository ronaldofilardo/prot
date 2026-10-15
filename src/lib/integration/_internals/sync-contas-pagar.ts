import type { PrismaClient } from "@prisma/client";
import type { CanonicalPayable } from "../canonical";
import { logSyncError, logSyncStart, logSyncSuccess } from "../logger";
import { parseContaPagarExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";

async function upsertContaPagar(
  tx: PrismaClient,
  empresaId: string,
  reg: CanonicalPayable
): Promise<"update" | "insert"> {
  const { filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja } =
    parseContaPagarExternalId(reg.externalId);

  const existing = await tx.contaPagar.findUnique({
    where: {
      filial_prefixo_numero_parcela_tipo_fornecedorCodigo_fornecedorLoja_empresaId: {
        filial,
        prefixo,
        numero,
        parcela,
        tipo,
        fornecedorCodigo,
        fornecedorLoja,
        empresaId,
      },
    },
  });

  if (existing) {
    await tx.contaPagar.update({
      where: { id: existing.id },
      data: {
        valor: reg.amount,
        saldo: reg.balance ?? reg.amount,
        vencimento: new Date(reg.dueDate),
        fornecedorNome: reg.supplierName,
        sincronizadoEm: new Date(),
      },
    });
    return "update";
  }

  await tx.contaPagar.create({
    data: {
      filial,
      prefixo,
      numero,
      parcela,
      tipo,
      fornecedorCodigo,
      fornecedorLoja,
      fornecedorNome: reg.supplierName,
      dataEmissao: new Date(reg.issueDate),
      vencimento: new Date(reg.dueDate),
      valor: reg.amount,
      saldo: reg.balance ?? reg.amount,
      empresaId,
    },
  });
  return "insert";
}

export async function syncContasPagar(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalPayable[]
): Promise<SyncResult> {
  logSyncStart("ContaPagar", empresaId, registros.length);
  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for (const reg of registros) {
    try {
      const action = await upsertContaPagar(tx, empresaId, reg);
      if (action === "insert") {
        criados++;
      } else {
        atualizados++;
      }
      logSyncSuccess("ContaPagar", reg.externalId, action);
    } catch (err) {
      erros++;
      logSyncError("ContaPagar", reg.externalId, err);
    }
  }

  return { entidade: "ContaPagar", processados: registros.length, criados, atualizados, erros };
}
