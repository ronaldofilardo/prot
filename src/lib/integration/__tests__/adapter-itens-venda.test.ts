import { describe, expect, it } from "vitest";
import { csvRowToCanonicalItemVenda } from "../_internals/adapter-itens-venda";

describe("csvRowToCanonicalItemVenda", () => {
  it("converte linha de SD2 para CanonicalSaleItem com tipos e externalId corretos", () => {
    const row = {
      D2_FILIAL: "01",
      D2_DOC: "000100",
      D2_SERIE: "1",
      D2_ITEM: "01",
      D2_COD: "PROD123",
      D2_CLIENTE: "000001",
      D2_LOJA: "01",
      D2_EMISSAO: "20260315",
      D2_QUANT: "10.5",
      D2_TOTAL: "1500.50",
      D2_CUSTO1: "950.00",
      D2_CF: "5102",
      D2_TES: "501",
      D2_TIPO: "N",
      D2_QTDEDEV: "0",
      D2_VALDEV: "0.00",
    };

    const item = csvRowToCanonicalItemVenda(row, "emp-01");

    expect(item.company).toBe("emp-01");
    expect(item.branch).toBe("01");
    expect(item.documentNumber).toBe("000100");
    expect(item.series).toBe("1");
    expect(item.item).toBe("01");
    expect(item.productCode).toBe("PROD123");
    expect(item.partyExternalId).toBe("emp-01-CLI-000001-01");
    expect(item.externalId).toBe("emp-01-IT-01-000100-1-000001-01-01");
    expect(item.quantity).toBe(10.5);
    expect(item.totalAmount).toBe(1500.5);
    expect(item.costAmount).toBe(950);
    expect(item.cfop).toBe("5102");
    expect(item.tes).toBe("501");
    expect(item.type).toBe("N");
    expect(item.issueDate).toBe("2026-03-15T00:00:00.000Z");
  });

  it("aplica fallbacks seguros quando campos estão vazios", () => {
    const row = {};
    const item = csvRowToCanonicalItemVenda(row, "emp-01");

    expect(item.branch).toBe("01");
    expect(item.item).toBe("01");
    expect(item.quantity).toBe(0);
    expect(item.totalAmount).toBe(0);
    expect(item.costAmount).toBe(0);
    expect(item.type).toBe("N");
  });
});
