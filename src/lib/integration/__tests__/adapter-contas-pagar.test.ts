import { describe, it, expect } from "vitest";
import { csvRowToCanonicalContaPagar } from "../_internals/adapter-contas-pagar";

describe("csvRowToCanonicalContaPagar", () => {
  it("converte linha da SE2 para CanonicalPayable com externalId correto", () => {
    const row = {
      E2_FILIAL: "01",
      E2_PREFIXO: "NF",
      E2_NUM: "000123",
      E2_PARCELA: "1",
      E2_TIPO: "NF",
      E2_FORNECE: "FORN01",
      E2_LOJA: "01",
      E2_NOMFOR: "FORNECEDOR BRASIL LTDA",
      E2_EMISSAO: "20260401",
      E2_VENCTO: "20260501",
      E2_VALOR: "15000.50",
    };

    const res = csvRowToCanonicalContaPagar(row, "emp-01");

    expect(res).toEqual({
      externalId: "emp-01-CP-01-NF-000123-1-NF-FORN01-01",
      company: "emp-01",
      branch: "01",
      prefix: "NF",
      number: "000123",
      installment: "1",
      type: "NF",
      supplierCode: "FORN01",
      supplierStore: "01",
      supplierName: "FORNECEDOR BRASIL LTDA",
      issueDate: "2026-04-01T00:00:00.000Z",
      dueDate: "2026-05-01T00:00:00.000Z",
      amount: 15000.5,
      balance: 15000.5,
      currency: "BRL",
      updatedAt: expect.any(String),
    });
  });

  it("trata valores padrão quando campos opcionais estão vazios", () => {
    const row = {
      E2_NUM: "999",
      E2_VALOR: "100",
    };

    const res = csvRowToCanonicalContaPagar(row, "emp-01");
    expect(res.branch).toBe("01");
    expect(res.type).toBe("NF");
    expect(res.supplierStore).toBe("01");
    expect(res.amount).toBe(100);
  });
});
