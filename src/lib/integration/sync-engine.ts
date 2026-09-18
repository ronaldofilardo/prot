/**
 * Sync Engine — upsert idempotente com delta sync.
 *
 * Referência: guia de integração §5:
 * - Chave idempotente: empresa + filial + tipo + número + parcela
 * - Delta: usa `sincronizadoEm` para extrair só o novo
 * - Idempotência: upsert evita duplicação
 */

import { PrismaClient } from "@prisma/client";
import type {
  CanonicalParty,
  CanonicalInvoice,
  CanonicalTitle,
  CanonicalPayment,
} from "./canonical";
import { logSyncStart, logSyncSuccess, logSyncError, logSyncSkip } from "./logger";

export interface SyncResult {
  entidade: string;
  processados: number;
  criados: number;
  atualizados: number;
  erros: number;
}

export function parseClienteExternalId(externalId: string): { codigo: string; loja: string } {
  const idx = externalId.indexOf("-CLI-");
  if (idx === -1) {
    const parts = externalId.split("-");
    return { codigo: parts[0] || "", loja: parts[1] || "01" };
  }
  const suffix = externalId.substring(idx + 5);
  const [codigo, loja] = suffix.split("-");
  return { codigo: codigo || "", loja: loja || "01" };
}

export function parseFaturamentoExternalId(externalId: string): { filial: string; numeroNota: string } {
  const idx = externalId.indexOf("-NF-");
  if (idx === -1) {
    const parts = externalId.split("-");
    return { filial: parts[0] || "01", numeroNota: parts[1] || "" };
  }
  const suffix = externalId.substring(idx + 4);
  const [filial, numeroNota] = suffix.split("-");
  return { filial: filial || "01", numeroNota: numeroNota || "" };
}

export function parseContaReceberExternalId(externalId: string): {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
} {
  const idx = externalId.indexOf("-CR-");
  if (idx === -1) {
    const parts = externalId.split("-");
    return { filial: parts[0] || "01", prefixo: parts[1] || "", numero: parts[2] || "", parcela: parts[3] || "" };
  }
  const suffix = externalId.substring(idx + 4);
  const [filial, prefixo, numero, parcela] = suffix.split("-");
  return { filial: filial || "01", prefixo: prefixo || "", numero: numero || "", parcela: parcela || "" };
}

export function parseBaixaExternalId(externalId: string): {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
} {
  const idx = externalId.indexOf("-BX-");
  if (idx === -1) {
    const parts = externalId.split("-");
    return { filial: parts[0] || "01", prefixo: parts[1] || "", numero: parts[2] || "", parcela: parts[3] || "" };
  }
  const suffix = externalId.substring(idx + 4);
  const [filial, prefixo, numero, parcela] = suffix.split("-");
  return { filial: filial || "01", prefixo: prefixo || "", numero: numero || "", parcela: parcela || "" };
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

      const existing = await tx.cliente.findUnique({
        where: { codigo_loja_empresaId: { codigo, loja, empresaId } },
      });

      if (existing) {
        await tx.cliente.update({
          where: { id: existing.id },
          data: { nome: reg.name, cidade: reg.city, estado: reg.state, ativo: reg.active },
        });
        atualizados++;
      } else {
        await tx.cliente.create({
          data: { codigo, loja, nome: reg.name, cidade: reg.city, estado: reg.state, ativo: reg.active, empresaId },
        });
        criados++;
      }
      logSyncSuccess("Cliente", reg.externalId, existing ? "update" : "insert");
    } catch (err) {
      erros++;
      logSyncError("Cliente", reg.externalId, err);
    }
  }

  return { entidade: "Cliente", processados: registros.length, criados, atualizados, erros };
}

export async function syncFaturamentos(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalInvoice[]
): Promise<SyncResult> {
  logSyncStart("Faturamento", empresaId, registros.length);
  let criados = 0, atualizados = 0, erros = 0;

  for (const reg of registros) {
    try {
      const { filial, numeroNota } = parseFaturamentoExternalId(reg.externalId);

      const existing = await tx.faturamento.findUnique({
        where: { filial_numeroNota_empresaId: { filial, numeroNota, empresaId } },
      });

      if (existing) {
        await tx.faturamento.update({
          where: { id: existing.id },
          data: { valorTotal: reg.amount, dataEmissao: new Date(reg.issueDate) },
        });
        atualizados++;
      } else {
        const cliente = await resolveClienteByExternalId(tx, reg.partyExternalId, empresaId);
        if (!cliente) {
          logSyncSkip("Faturamento", reg.externalId, "cliente nao encontrado");
          erros++;
          continue;
        }
        await tx.faturamento.create({
          data: { filial, numeroNota, dataEmissao: new Date(reg.issueDate), valorTotal: reg.amount, clienteId: cliente.id, empresaId },
        });
        criados++;
      }
      logSyncSuccess("Faturamento", reg.externalId, existing ? "update" : "insert");
    } catch (err) {
      erros++;
      logSyncError("Faturamento", reg.externalId, err);
    }
  }

  return { entidade: "Faturamento", processados: registros.length, criados, atualizados, erros };
}

export async function syncContasReceber(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalTitle[]
): Promise<SyncResult> {
  logSyncStart("ContaReceber", empresaId, registros.length);
  let criados = 0, atualizados = 0, erros = 0;

  for (const reg of registros) {
    try {
      const { filial, prefixo, numero, parcela } = parseContaReceberExternalId(reg.externalId);

      const existing = await tx.contaReceber.findUnique({
        where: { filial_prefixo_numero_parcela_empresaId: { filial, prefixo, numero, parcela, empresaId } },
      });

      if (existing) {
        await tx.contaReceber.update({
          where: { id: existing.id },
          data: { valor: reg.amount, vencimento: new Date(reg.dueDate) },
        });
        atualizados++;
      } else {
        const cliente = await resolveClienteByExternalId(tx, reg.partyExternalId, empresaId);
        if (!cliente) {
          logSyncSkip("ContaReceber", reg.externalId, "cliente nao encontrado");
          erros++;
          continue;
        }
        await tx.contaReceber.create({
          data: {
            filial, prefixo, numero, parcela, tipo: reg.type,
            dataEmissao: new Date(reg.issueDate), vencimento: new Date(reg.dueDate),
            valor: reg.amount, clienteId: cliente.id, empresaId,
          },
        });
        criados++;
      }
      logSyncSuccess("ContaReceber", reg.externalId, existing ? "update" : "insert");
    } catch (err) {
      erros++;
      logSyncError("ContaReceber", reg.externalId, err);
    }
  }

  return { entidade: "ContaReceber", processados: registros.length, criados, atualizados, erros };
}

export async function syncBaixas(
  tx: PrismaClient,
  empresaId: string,
  registros: CanonicalPayment[]
): Promise<SyncResult> {
  logSyncStart("Baixa", empresaId, registros.length);
  let criados = 0;
  let erros = 0;

  for (const reg of registros) {
    try {
      const { filial, prefixo, numero, parcela } = parseContaReceberExternalId(reg.titleExternalId);

      const contaReceber = await tx.contaReceber.findUnique({
        where: { filial_prefixo_numero_parcela_empresaId: { filial, prefixo, numero, parcela, empresaId } },
      });

      if (!contaReceber) {
        logSyncSkip("Baixa", reg.externalId, "conta a receber nao encontrada");
        erros++;
        continue;
      }

      const { prefixo: bxPrefixo, numero: bxNumero, parcela: bxParcela } = parseBaixaExternalId(reg.externalId);

      const existing = await tx.baixa.findFirst({
        where: {
          contaReceberId: contaReceber.id,
          prefixo: bxPrefixo,
          numero: bxNumero,
          parcela: bxParcela,
          empresaId,
        },
      });

      if (existing) {
        logSyncSkip("Baixa", reg.externalId, "ja existe");
        continue;
      }

      await tx.baixa.create({
        data: {
          filial: reg.branch,
          filialBaixa: reg.paymentBranch,
          prefixo: bxPrefixo,
          numero: bxNumero,
          parcela: bxParcela,
          tipo: reg.type,
          valorBaixa: reg.amount,
          dataBaixa: new Date(reg.paymentDate),
          contaReceberId: contaReceber.id,
          empresaId,
        },
      });
      criados++;
      logSyncSuccess("Baixa", reg.externalId, "insert");
    } catch (err) {
      erros++;
      logSyncError("Baixa", reg.externalId, err);
    }
  }

  return { entidade: "Baixa", processados: registros.length, criados, atualizados: 0, erros };
}

async function resolveClienteByExternalId(
  tx: PrismaClient,
  externalId: string,
  empresaId: string
) {
  const { codigo, loja } = parseClienteExternalId(externalId);
  return tx.cliente.findUnique({
    where: { codigo_loja_empresaId: { codigo, loja, empresaId } },
  });
}
