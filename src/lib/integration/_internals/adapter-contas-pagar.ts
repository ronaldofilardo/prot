import type { CanonicalPayable } from "../canonical";
import type { ProtheusRow } from "../protheus-client";
import { parseProtheusDate, trimField, trimOr } from "./adapter-fields";

export function csvRowToCanonicalContaPagar(
  row: ProtheusRow | Record<string, string>,
  empresaId: string
): CanonicalPayable {
  const filial = trimOr(row, "E2_FILIAL", "01");
  const prefixo = trimOr(row, "E2_PREFIXO", "");
  const num = trimOr(row, "E2_NUM", "");
  const parcela = trimOr(row, "E2_PARCELA", "");
  const tipo = trimOr(row, "E2_TIPO", "NF");
  const fornecedorCodigo = trimOr(row, "E2_FORNECE", "");
  const fornecedorLoja = trimOr(row, "E2_LOJA", "01");
  const fornecedorNome = trimOr(row, "E2_NOMFOR", "");

  const valorStr = trimField(row, "E2_VALOR");
  const valor = parseFloat(valorStr) || 0;
  const saldoRaw = trimField(row, "E2_SALDO");
  const balance = saldoRaw ? parseFloat(saldoRaw) : valor;

  return {
    externalId: `${empresaId}-CP-${filial}-${prefixo}-${num}-${parcela}-${tipo}-${fornecedorCodigo}-${fornecedorLoja}`,
    company: empresaId,
    branch: filial,
    prefix: prefixo,
    number: num,
    installment: parcela,
    type: tipo,
    supplierCode: fornecedorCodigo,
    supplierStore: fornecedorLoja,
    supplierName: fornecedorNome,
    issueDate: parseProtheusDate(trimField(row, "E2_EMISSAO")),
    dueDate: parseProtheusDate(trimField(row, "E2_VENCTO")),
    amount: valor,
    balance,
    currency: "BRL",
    updatedAt: new Date().toISOString(),
  };
}
