/**
 * Modelo canônico interno — desacoplado das tabelas Protheus.
 * Referência: guia de integração §3 "Não faça um espelhamento cego".
 *
 * Cada entidade canônica tem um `externalId` que compõe a chave
 * idempotente (empresa + filial + tipo + número + parcela).
 */

export type EntidadeCanonica = "Cliente" | "Fornecedor" | "Faturamento" | "ContaReceber" | "ContaPagar" | "Baixa";

export type StatusTitulo = "open" | "partial" | "paid" | "overdue" | "cancelled";

export interface CanonicalParty {
  externalId: string;
  company: string;
  branch: string;
  name: string;
  city: string;
  state: string;
  active: boolean;
  updatedAt: string;
}

export interface CanonicalInvoice {
  externalId: string;
  company: string;
  branch: string;
  documentNumber: string;
  partyExternalId: string;
  issueDate: string;
  amount: number;
  currency: string;
  updatedAt: string;
}

export interface CanonicalTitle {
  externalId: string;
  company: string;
  branch: string;
  prefix: string;
  number: string;
  installment: string;
  type: string;
  partyExternalId: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: StatusTitulo;
  costCenter?: string;
  updatedAt: string;
}

export interface CanonicalPayment {
  externalId: string;
  company: string;
  branch: string;
  paymentBranch: string;
  prefix: string;
  number: string;
  installment: string;
  type: string;
  amount: number;
  paymentDate: string;
  titleExternalId: string;
  updatedAt: string;
}

export interface IngestPayload {
  empresaId: string;
  entidade: EntidadeCanonica;
  registros: CanonicalParty[] | CanonicalInvoice[] | CanonicalTitle[] | CanonicalPayment[];
}
