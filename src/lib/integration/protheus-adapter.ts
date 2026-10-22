/**
 * Adapter Protheus → Modelo Canônico.
 * Transforma linhas CSV (formato Protheus) em entidades canônicas.
 * Referência: guia de integração §3 "modelo canônico interno".
 */

import type { CanonicalParty, CanonicalInvoice, CanonicalTitle, CanonicalPayment, CanonicalSaldoContabil } from "./canonical";
import { parseProtheusDate, trimField, trimOr, parseCompetencia } from "./_internals/adapter-fields";

export { csvRowToCanonicalContaPagar } from "./_internals/adapter-contas-pagar";
export { csvRowToCanonicalBaixaPagar, filterBaixasPagar } from "./_internals/adapter-baixas-pagar";

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
  const filial = trimOr(row, "F2_FILIAL", "01");
  const doc = trimOr(row, "F2_DOC", "");
  const serie = trimField(row, "F2_SERIE");
  const serieSuffix = serie ? `-${serie}` : "";
  return {
    externalId: `${empresaId}-NF-${filial}-${doc}${serieSuffix}`,
    company: empresaId,
    branch: filial,
    documentNumber: doc,
    series: serie || undefined,
    partyExternalId: `${empresaId}-CLI-${trimField(row, "F2_CLIENTE")}-${trimField(row, "F2_LOJA")}`,
    issueDate: parseProtheusDate(trimField(row, "F2_EMISSAO")),
    amount: parseFloat(valorStr) || 0,
    currency: "BRL",
    updatedAt: new Date().toISOString(),
  };
}

export function csvRowToCanonicalContaReceber(row: Record<string, string>, empresaId: string): CanonicalTitle {
  const amount = parseFloat(trimField(row, "E1_VALOR")) || 0;
  const saldoRaw = trimField(row, "E1_SALDO");
  const balance = saldoRaw ? parseFloat(saldoRaw) : amount;
  const filial = trimOr(row, "E1_FILIAL", "01");
  const prefixo = trimOr(row, "E1_PREFIXO", "");
  const num = trimOr(row, "E1_NUM", "");
  const parcela = trimOr(row, "E1_PARCELA", "");
  const tipo = trimOr(row, "E1_TIPO", "DUP");

  return {
    externalId: `${empresaId}-CR-${filial}-${prefixo}-${num}-${parcela}-${tipo}`,
    company: empresaId,
    branch: filial,
    prefix: prefixo,
    number: num,
    installment: parcela,
    type: tipo,
    partyExternalId: `${empresaId}-CLI-${trimField(row, "E1_CLIENTE")}-${trimField(row, "E1_LOJA")}`,
    issueDate: parseProtheusDate(trimField(row, "E1_EMISSAO")),
    dueDate: parseProtheusDate(trimField(row, "E1_VENCTO")),
    amount,
    balance,
    currency: "BRL",
    status: "open",
    updatedAt: new Date().toISOString(),
  };
}

export function csvRowToCanonicalBaixa(row: Record<string, string>, empresaId: string): CanonicalPayment {
  const filial = trimOr(row, "E5_FILIAL", "01"), prefixo = trimOr(row, "E5_PREFIXO", "");
  const num = trimOr(row, "E5_NUMERO", "") || trimOr(row, "E5_NUM", "");
  const parcela = trimOr(row, "E5_PARCELA", ""), data = trimOr(row, "E5_DATA", "") || trimOr(row, "E5_BAIXA", "");
  const seq = trimOr(row, "E5_SEQ", ""), seqSuffix = seq ? `-${seq}` : "";
  const tipo = trimOr(row, "E5_TIPO", "DUP");

  return {
    externalId: `${empresaId}-BX-${filial}-${prefixo}-${num}-${parcela}-${tipo}-${data}${seqSuffix}`,
    company: empresaId,
    branch: filial,
    paymentBranch: trimOr(row, "E5_FILBAI", "01"),
    prefix: prefixo,
    number: num,
    installment: parcela,
    type: tipo,
    sequence: seq || undefined,
    amount: parseFloat(trimField(row, "E5_VALOR")) || 0,
    paymentDate: parseProtheusDate(data),
    titleExternalId: `${empresaId}-CR-${filial}-${prefixo}-${num}-${parcela}-${tipo}`,
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

