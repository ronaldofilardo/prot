import { describe, expect, it } from "vitest";
import {
  csvRowToCanonicalBaixaPagar,
  filterBaixasPagar,
} from "../_internals/adapter-baixas-pagar";

describe("adapter-baixas-pagar", () => {
  it("filtra apenas linhas com E5_RECPAG === 'P'", () => {
    const rows = [
      { E5_RECPAG: "R", E5_NUMERO: "001" },
      { E5_RECPAG: "P", E5_NUMERO: "002" },
      { E5_RECPAG: "p ", E5_NUMERO: "003" },
      { E5_RECPAG: "", E5_NUMERO: "004" },
    ];
    const pagas = filterBaixasPagar(rows);
    expect(pagas).toHaveLength(2);
    expect(pagas.map((r) => r.E5_NUMERO)).toEqual(["002", "003"]);
  });

  it("converte linha da SE5 para CanonicalPayment com vínculo à ContaPagar", () => {
    const row = {
      E5_FILIAL: "01",
      E5_PREFIXO: "UNI",
      E5_NUMERO: "000099",
      E5_PARCELA: "1",
      E5_TIPO: "NF",
      E5_CLIFOR: "FORN01",
      E5_LOJA: "01",
      E5_DATA: "20240115",
      E5_SEQ: "01",
      E5_VALOR: "1500.50",
      E5_FILBAI: "01",
    };

    const canonical = csvRowToCanonicalBaixaPagar(row, "emp-01");

    expect(canonical).toEqual({
      externalId: "emp-01-BXP-01-UNI-000099-1-NF-FORN01-01-20240115-01",
      company: "emp-01",
      branch: "01",
      paymentBranch: "01",
      prefix: "UNI",
      number: "000099",
      installment: "1",
      type: "NF",
      sequence: "01",
      amount: 1500.5,
      paymentDate: "2024-01-15T00:00:00.000Z",
      titleExternalId: "emp-01-CP-01-UNI-000099-1-NF-FORN01-01",
      supplierCode: "FORN01",
      supplierStore: "01",
      updatedAt: expect.any(String),
    });
  });
});
