/**
 * Adapter Protheus → Modelo Canônico.
 * Transforma linhas CSV (formato Protheus) em entidades canônicas.
 * Referência: guia de integração §3 "modelo canônico interno".
 */

import type { CanonicalParty, CanonicalInvoice, CanonicalTitle, CanonicalPayment } from "./canonical";

export function csvRowToCanonicalCliente(row: Record<string, string>, empresaId: string): CanonicalParty {
  return {
    externalId: `${empresaId}-CLI-${row.A1_COD?.trim()}-${row.A1_LOJA?.trim()}`,
    company: empresaId,
    branch: row.A1_LOJA?.trim() || "01",
    name: row.A1_NOME?.trim() || "",
    city: row.A1_MUN?.trim() || "",
    state: row.A1_EST?.trim() || "",
    active: row.D_E_L_E_T_ !== "*",
    updatedAt: new Date().toISOString(),
  };
}

export function csvRowToCanonicalFaturamento(row: Record<string, string>, empresaId: string): CanonicalInvoice {
  return {
    externalId: `${empresaId}-NF-${row.F2_FILIAL?.trim()}-${row.F2_DOC?.trim()}`,
    company: empresaId,
    branch: row.F2_FILIAL?.trim() || "01",
    documentNumber: row.F2_DOC?.trim() || "",
    partyExternalId: `${empresaId}-CLI-${row.F2_CLIENTE?.trim()}-${row.F2_LOJA?.trim()}`,
    issueDate: parseProtheusDate(row.F2_EMISSAO),
    amount: parseFloat(row.F2_VALOR) || 0,
    currency: "BRL",
    updatedAt: new Date().toISOString(),
  };
}

export function csvRowToCanonicalContaReceber(row: Record<string, string>, empresaId: string): CanonicalTitle {
  return {
    externalId: `${empresaId}-CR-${row.E1_FILIAL?.trim()}-${row.E1_PREFIXO?.trim()}-${row.E1_NUM?.trim()}-${row.E1_PARCELA?.trim()}`,
    company: empresaId,
    branch: row.E1_FILIAL?.trim() || "01",
    prefix: row.E1_PREFIXO?.trim() || "",
    number: row.E1_NUM?.trim() || "",
    installment: row.E1_PARCELA?.trim() || "",
    type: row.E1_TIPO?.trim() || "DUP",
    partyExternalId: `${empresaId}-CLI-${row.E1_CLIENTE?.trim()}-${row.E1_LOJA?.trim()}`,
    issueDate: parseProtheusDate(row.E1_EMISSAO),
    dueDate: parseProtheusDate(row.E1_VENCTO),
    amount: parseFloat(row.E1_VALOR) || 0,
    currency: "BRL",
    status: "open",
    updatedAt: new Date().toISOString(),
  };
}

export function csvRowToCanonicalBaixa(row: Record<string, string>, empresaId: string): CanonicalPayment {
  return {
    externalId: `${empresaId}-BX-${row.E5_FILIAL?.trim()}-${row.E5_PREFIXO?.trim()}-${row.E5_NUM?.trim()}-${row.E5_PARCELA?.trim()}-${row.E5_BAIXA?.trim()}`,
    company: empresaId,
    branch: row.E5_FILIAL?.trim() || "01",
    paymentBranch: row.E5_FILBAI?.trim() || "01",
    prefix: row.E5_PREFIXO?.trim() || "",
    number: row.E5_NUM?.trim() || "",
    installment: row.E5_PARCELA?.trim() || "",
    type: row.E5_TIPO?.trim() || "DUP",
    amount: parseFloat(row.E5_VALOR) || 0,
    paymentDate: parseProtheusDate(row.E5_BAIXA),
    titleExternalId: `${empresaId}-CR-${row.E5_FILIAL?.trim()}-${row.E5_PREFIXO?.trim()}-${row.E5_NUM?.trim()}-${row.E5_PARCELA?.trim()}`,
    updatedAt: new Date().toISOString(),
  };
}

function parseProtheusDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return new Date().toISOString();
  const y = dateStr.substring(0, 4);
  const m = dateStr.substring(4, 6);
  const d = dateStr.substring(6, 8);
  return `${y}-${m}-${d}T00:00:00.000Z`;
}
