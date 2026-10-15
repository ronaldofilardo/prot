import type { CanonicalPayment } from "../canonical";
import type { ProtheusRow } from "../protheus-client";
import { parseProtheusDate, trimField, trimOr } from "./adapter-fields";

export function filterBaixasPagar(rows: ProtheusRow[]): ProtheusRow[] {
  return rows.filter((row) => (row.E5_RECPAG ?? "").trim().toUpperCase() === "P");
}

export function csvRowToCanonicalBaixaPagar(
  row: ProtheusRow | Record<string, string>,
  empresaId: string
): CanonicalPayment {
  const filial = trimOr(row, "E5_FILIAL", "01");
  const prefixo = trimOr(row, "E5_PREFIXO", "");
  const num = trimOr(row, "E5_NUMERO", "") || trimOr(row, "E5_NUM", "");
  const parcela = trimOr(row, "E5_PARCELA", "");
  const tipo = trimOr(row, "E5_TIPO", "NF");
  const fornecedorCodigo = trimOr(row, "E5_CLIFOR", "");
  const fornecedorLoja = trimOr(row, "E5_LOJA", "01");
  const data = trimOr(row, "E5_DATA", "") || trimOr(row, "E5_BAIXA", "");
  const seq = trimOr(row, "E5_SEQ", "");
  const seqSuffix = seq ? `-${seq}` : "";

  return {
    externalId: `${empresaId}-BXP-${filial}-${prefixo}-${num}-${parcela}-${tipo}-${fornecedorCodigo}-${fornecedorLoja}-${data}${seqSuffix}`,
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
    titleExternalId: `${empresaId}-CP-${filial}-${prefixo}-${num}-${parcela}-${tipo}-${fornecedorCodigo}-${fornecedorLoja}`,
    supplierCode: fornecedorCodigo,
    supplierStore: fornecedorLoja,
    updatedAt: new Date().toISOString(),
  };
}
