import type { CanonicalSaleItem } from "../canonical";
import { parseProtheusDate, trimField, trimOr } from "./adapter-fields";

export function csvRowToCanonicalItemVenda(
  row: Record<string, string | unknown>,
  empresaId: string
): CanonicalSaleItem {
  const r = row as Record<string, unknown>;
  const filial = trimOr(r, "D2_FILIAL", "01");
  const doc = trimOr(r, "D2_DOC", "");
  const serie = trimOr(r, "D2_SERIE", "");
  const item = trimOr(r, "D2_ITEM", "01");
  const codCliente = trimField(r, "D2_CLIENTE") || "";
  const lojaCliente = trimOr(r, "D2_LOJA", "01");

  const partyExternalId = `${empresaId}-CLI-${codCliente}-${lojaCliente}`;
  const externalId = `${empresaId}-IT-${filial}-${doc}-${serie}-${codCliente}-${lojaCliente}-${item}`;

  return {
    externalId,
    company: empresaId,
    branch: filial,
    documentNumber: doc,
    series: serie,
    item,
    productCode: trimOr(r, "D2_COD", ""),
    partyExternalId,
    issueDate: parseProtheusDate(trimField(r, "D2_EMISSAO")),
    quantity: parseFloat(trimOr(r, "D2_QUANT", "0")) || 0,
    totalAmount: parseFloat(trimOr(r, "D2_TOTAL", "0")) || 0,
    costAmount: parseFloat(trimOr(r, "D2_CUSTO1", "0")) || 0,
    cfop: trimOr(r, "D2_CF", ""),
    tes: trimOr(r, "D2_TES", ""),
    type: trimOr(r, "D2_TIPO", "N"),
    returnedQuantity: parseFloat(trimOr(r, "D2_QTDEDEV", "0")) || 0,
    returnedAmount: parseFloat(trimOr(r, "D2_VALDEV", "0")) || 0,
    updatedAt: new Date().toISOString(),
  };
}
