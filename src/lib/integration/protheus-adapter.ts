/**
 * Adapter Protheus → Modelo Canônico.
 * Transforma linhas CSV (formato Protheus) em entidades canônicas.
 * Referência: guia de integração §3 "modelo canônico interno".
 */

import type { CanonicalParty, CanonicalInvoice, CanonicalTitle, CanonicalPayment, CanonicalSaldoContabil } from "./canonical";
import { parseProtheusDate, trimField, trimOr, parseCompetencia } from "./_internals/adapter-fields";

export function csvRowToCanonicalCliente(row: Record<string, string>, empresaId: string): CanonicalParty {
  return {
    externalId: `${empresaId}-CLI-${trimField(row, "A1_COD")}-${trimField(row, "A1_LOJA")}`,
    company: empresaId,
    branch: trimOr(row, "A1_LOJA", "01"),
    name: trimOr(row, "A1_NOME", ""),
    city: trimOr(row, "A1_MUN", ""),
    state: trimOr(row, "A1_EST", ""),
    active: row.D_E_L_E_T_ !== "*",
    updatedAt: new Date().toISOString(),
  };
}

export function csvRowToCanonicalFaturamento(row: Record<string, string>, empresaId: string): CanonicalInvoice {
  const valorStr = trimField(row, "F2_VALOR") || trimField(row, "F2_VALMERC") || trimField(row, "F2_VALBRUT");
  return {
    externalId: `${empresaId}-NF-${trimField(row, "F2_FILIAL")}-${trimField(row, "F2_DOC")}`,
    company: empresaId,
    branch: trimOr(row, "F2_FILIAL", "01"),
    documentNumber: trimOr(row, "F2_DOC", ""),
    partyExternalId: `${empresaId}-CLI-${trimField(row, "F2_CLIENTE")}-${trimField(row, "F2_LOJA")}`,
    issueDate: parseProtheusDate(trimField(row, "F2_EMISSAO")),
    amount: parseFloat(valorStr) || 0,
    currency: "BRL",
    updatedAt: new Date().toISOString(),
  };
}

export function csvRowToCanonicalContaReceber(row: Record<string, string>, empresaId: string): CanonicalTitle {
  return {
    externalId: `${empresaId}-CR-${trimField(row, "E1_FILIAL")}-${trimField(row, "E1_PREFIXO")}-${trimField(row, "E1_NUM")}-${trimField(row, "E1_PARCELA")}`,
    company: empresaId,
    branch: trimOr(row, "E1_FILIAL", "01"),
    prefix: trimOr(row, "E1_PREFIXO", ""),
    number: trimOr(row, "E1_NUM", ""),
    installment: trimOr(row, "E1_PARCELA", ""),
    type: trimOr(row, "E1_TIPO", "DUP"),
    partyExternalId: `${empresaId}-CLI-${trimField(row, "E1_CLIENTE")}-${trimField(row, "E1_LOJA")}`,
    issueDate: parseProtheusDate(trimField(row, "E1_EMISSAO")),
    dueDate: parseProtheusDate(trimField(row, "E1_VENCTO")),
    amount: parseFloat(trimField(row, "E1_VALOR")) || 0,
    currency: "BRL",
    status: "open",
    updatedAt: new Date().toISOString(),
  };
}

export function csvRowToCanonicalBaixa(row: Record<string, string>, empresaId: string): CanonicalPayment {
  return {
    externalId: `${empresaId}-BX-${trimField(row, "E5_FILIAL")}-${trimField(row, "E5_PREFIXO")}-${trimField(row, "E5_NUM")}-${trimField(row, "E5_PARCELA")}-${trimField(row, "E5_BAIXA")}`,
    company: empresaId,
    branch: trimOr(row, "E5_FILIAL", "01"),
    paymentBranch: trimOr(row, "E5_FILBAI", "01"),
    prefix: trimOr(row, "E5_PREFIXO", ""),
    number: trimOr(row, "E5_NUM", ""),
    installment: trimOr(row, "E5_PARCELA", ""),
    type: trimOr(row, "E5_TIPO", "DUP"),
    amount: parseFloat(trimField(row, "E5_VALOR")) || 0,
    paymentDate: parseProtheusDate(trimField(row, "E5_BAIXA")),
    titleExternalId: `${empresaId}-CR-${trimField(row, "E5_FILIAL")}-${trimField(row, "E5_PREFIXO")}-${trimField(row, "E5_NUM")}-${trimField(row, "E5_PARCELA")}`,
    updatedAt: new Date().toISOString(),
  };
}

export function csvRowToCanonicalSaldoContabil(row: Record<string, string>, empresaId: string): CanonicalSaldoContabil {
  const branch = trimOr(row, "CQ_FILIAL", "01");
  const account = trimOr(row, "CQ_CONTA", "");
  const period = parseCompetencia(trimField(row, "CQ_MES"), trimField(row, "CQ_ANO"), trimField(row, "CQ_DATA"));
  const fiscalYear = period.substring(0, 4);

  const previousBalance = parseFloat(trimField(row, "CQ_SALANT") || trimField(row, "CQ_SALDOA")) || 0;
  const debits = parseFloat(trimField(row, "CQ_DEB")) || 0;
  const credits = parseFloat(trimField(row, "CQ_CRED")) || 0;
  const currentBalance = parseFloat(trimField(row, "CQ_SALDO") || trimField(row, "CQ_SALDOF")) || 0;

  return {
    externalId: `${empresaId}-SC-${branch}-${account}-${period}`,
    company: empresaId,
    branch,
    account,
    period,
    fiscalYear,
    previousBalance,
    debits,
    credits,
    currentBalance,
    updatedAt: new Date().toISOString(),
  };
}

