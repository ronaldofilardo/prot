/**
 * Modelo canônico interno — desacoplado das tabelas Protheus.
 * Referência: guia de integração §3 "Não faça um espelhamento cego".
 *
 * Cada entidade canônica tem um `externalId` que compõe a chave
 * idempotente (empresa + filial + tipo + número + parcela).
 */

export type EntidadeCanonica = "Cliente" | "Fornecedor" | "Faturamento" | "ContaReceber" | "ContaPagar" | "Baixa" | "BaixaPagar" | "SaldoContabil" | "ItemVenda";

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
  balance?: number;
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
  sequence?: string;
  titleExternalId: string;
  supplierCode?: string;
  supplierStore?: string;
  updatedAt: string;
}

export interface CanonicalSaldoContabil {
  externalId: string;
  company: string;
  branch: string;
  account: string;
  period: string;
  fiscalYear: string;
  previousBalance: number;
  debits: number;
  credits: number;
  currentBalance: number;
  updatedAt: string;
}

export interface CanonicalSaleItem {
  externalId: string;
  company: string;
  branch: string;
  documentNumber: string;
  series: string;
  item: string;
  productCode: string;
  partyExternalId: string;
  issueDate: string;
  quantity: number;
  totalAmount: number;
  costAmount: number;
  cfop: string;
  tes: string;
  type: string;
  returnedQuantity?: number;
  returnedAmount?: number;
  updatedAt: string;
}

export interface CanonicalPayable {
  externalId: string;
  company: string;
  branch: string;
  prefix: string;
  number: string;
  installment: string;
  type: string;
  supplierCode: string;
  supplierStore: string;
  supplierName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  balance?: number;
  currency: string;
  updatedAt: string;
}

export interface IngestPayload {
  empresaId: string;
  entidade: EntidadeCanonica;
  registros: CanonicalParty[] | CanonicalInvoice[] | CanonicalTitle[] | CanonicalPayment[] | CanonicalSaldoContabil[] | CanonicalSaleItem[] | CanonicalPayable[];
}
