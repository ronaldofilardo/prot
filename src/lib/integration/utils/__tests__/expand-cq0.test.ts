import { describe, it, expect } from "vitest";
import { expandCq0ToLong, expandCq0Rows } from "../expand-cq0";

function cq0LongRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    CQ0_FILIAL: "00101001",
    CQ0_CONTA: "4102010001",
    CQ0_DATA: "2025-01-31",
    CQ0_MOEDA: "01",
    CQ0_TPSALD: "1",
    CQ0_DEBITO: "55917.47",
    CQ0_CREDIT: "0",
    ...overrides,
  };
}

function cq0WideRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    CQ0_FILIAL: "010101",
    CQ0_CONTA: "110101",
    CQ0_ANO: "2026",
    CQ0_MOEDA: "01",
    CQ0_TPSALD: "1",
    CQ0_SLDANT: "1000.00",
    CQ0_DEB01: "500.00",
    CQ0_CRE01: "200.00",
    CQ0_SLD01: "1300.00",
    ...overrides,
  };
}

describe("expandCq0ToLong — formato long real (CQ0_DATA)", () => {
  it("retorna [] para linha sem filial e sem conta", () => {
    expect(expandCq0ToLong({})).toEqual([]);
  });

  it("retorna a própria linha se já estiver no formato canônico (tem CQ_MES)", () => {
    const longRow = { CQ_FILIAL: "01", CQ_CONTA: "1101", CQ_MES: "03", CQ_ANO: "2026" };
    expect(expandCq0ToLong(longRow)).toEqual([longRow]);
  });

  it("converte CQ0_DATA em CQ_MES/CQ_ANO e mapeia debito/credito", () => {
    const result = expandCq0ToLong(cq0LongRow());
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      CQ_FILIAL: "00101001",
      CQ_CONTA: "4102010001",
      CQ_MES: "01",
      CQ_ANO: "2025",
      CQ_DEB: "55917.47",
      CQ_CRED: "0",
    });
  });

  it("aceita CQ0_DATA sem hífens (AAAAMMDD)", () => {
    const result = expandCq0ToLong(cq0LongRow({ CQ0_DATA: "20240430" }));
    expect(result[0].CQ_MES).toBe("04");
    expect(result[0].CQ_ANO).toBe("2024");
  });

  it("retorna [] quando moeda diferente de 01", () => {
    expect(expandCq0ToLong(cq0LongRow({ CQ0_MOEDA: "02" }))).toEqual([]);
  });

  it("retorna [] quando tipo de saldo diferente de 1", () => {
    expect(expandCq0ToLong(cq0LongRow({ CQ0_TPSALD: "2" }))).toEqual([]);
  });

  it("retorna [] quando CQ0_DATA é inválida", () => {
    expect(expandCq0ToLong(cq0LongRow({ CQ0_DATA: "abc" }))).toEqual([]);
  });
});

describe("expandCq0ToLong — formato wide (on-prem)", () => {
  it("expande 1 linha wide em linhas por mês com movimento", () => {
    const result = expandCq0ToLong(cq0WideRow());
    expect(result.length).toBeGreaterThanOrEqual(1);
    const jan = result.find((r) => r.CQ_MES === "01");
    expect(jan).toBeDefined();
    expect(jan!.CQ_FILIAL).toBe("010101");
    expect(jan!.CQ_CONTA).toBe("110101");
    expect(jan!.CQ_ANO).toBe("2026");
    expect(jan!.CQ_SALANT).toBe("1000");
    expect(jan!.CQ_DEB).toBe("500");
    expect(jan!.CQ_CRED).toBe("200");
    expect(jan!.CQ_SALDO).toBe("1300");
  });

  it("encadeia saldoAnterior: abertura do mês N = fechamento do mês N-1", () => {
    const row = cq0WideRow({
      CQ0_DEB02: "100.00",
      CQ0_CRE02: "0",
      CQ0_SLD02: "1400.00",
      CQ0_DEB03: "0",
      CQ0_CRE03: "300.00",
      CQ0_SLD03: "1100.00",
    });
    const result = expandCq0ToLong(row);
    const fev = result.find((r) => r.CQ_MES === "02");
    const mar = result.find((r) => r.CQ_MES === "03");
    expect(fev!.CQ_SALANT).toBe("1300");
    expect(mar!.CQ_SALANT).toBe("1400");
  });

  it("sempre inclui mês 01 mesmo sem movimento (saldo anterior como abertura)", () => {
    const row = cq0WideRow({
      CQ0_DEB01: "0", CQ0_CRE01: "0", CQ0_SLD01: "0",
      CQ0_SLDANT: "500.00",
    });
    const result = expandCq0ToLong(row);
    const jan = result.find((r) => r.CQ_MES === "01");
    expect(jan).toBeDefined();
    expect(jan!.CQ_SALANT).toBe("500");
  });

  it("pula meses sem movimento e sem saldo", () => {
    const row = cq0WideRow({
      CQ0_SLDANT: "0",
      CQ0_DEB01: "0", CQ0_CRE01: "0", CQ0_SLD01: "0",
      CQ0_DEB05: "99.00", CQ0_SLD05: "99.00",
    });
    const result = expandCq0ToLong(row);
    const meses = result.map((r) => r.CQ_MES);
    expect(meses).toContain("01");
    expect(meses).toContain("05");
    expect(meses).not.toContain("02");
  });
});

describe("expandCq0Rows", () => {
  it("calcula saldo acumulado (debito - credito) por conta no formato long", () => {
    const rows = [
      cq0LongRow({ CQ0_DATA: "2025-01-31", CQ0_DEBITO: "1000.00", CQ0_CREDIT: "0" }),
      cq0LongRow({ CQ0_DATA: "2025-02-28", CQ0_DEBITO: "0", CQ0_CREDIT: "300.00" }),
      cq0LongRow({ CQ0_DATA: "2025-03-31", CQ0_DEBITO: "200.00", CQ0_CREDIT: "0" }),
    ];
    const result = expandCq0Rows(rows);
    expect(result).toHaveLength(3);
    const [jan, fev, mar] = result;
    expect(jan.CQ_SALANT).toBe("0");
    expect(jan.CQ_SALDO).toBe("1000");
    expect(fev.CQ_SALANT).toBe("1000");
    expect(fev.CQ_SALDO).toBe("700");
    expect(mar.CQ_SALANT).toBe("700");
    expect(mar.CQ_SALDO).toBe("900");
  });

  it("acumula saldo entre anos (dez/2024 -> jan/2025)", () => {
    const rows = [
      cq0LongRow({ CQ0_DATA: "2024-12-31", CQ0_DEBITO: "500.00", CQ0_CREDIT: "0" }),
      cq0LongRow({ CQ0_DATA: "2025-01-31", CQ0_DEBITO: "100.00", CQ0_CREDIT: "0" }),
    ];
    const result = expandCq0Rows(rows);
    expect(result[0].CQ_SALDO).toBe("500");
    expect(result[1].CQ_SALANT).toBe("500");
    expect(result[1].CQ_SALDO).toBe("600");
  });

  it("mantém saldos independentes por conta", () => {
    const rows = [
      cq0LongRow({ CQ0_CONTA: "1101", CQ0_DATA: "2025-01-31", CQ0_DEBITO: "100.00", CQ0_CREDIT: "0" }),
      cq0LongRow({ CQ0_CONTA: "2202", CQ0_DATA: "2025-01-31", CQ0_DEBITO: "999.00", CQ0_CREDIT: "0" }),
    ];
    const result = expandCq0Rows(rows);
    const conta1 = result.find((r) => r.CQ_CONTA === "1101")!;
    const conta2 = result.find((r) => r.CQ_CONTA === "2202")!;
    expect(conta1.CQ_SALDO).toBe("100");
    expect(conta2.CQ_SALDO).toBe("999");
  });

  it("expande múltiplas linhas de formats diferentes", () => {
    const rows = [cq0LongRow(), cq0WideRow()];
    const result = expandCq0Rows(rows);
    const filiais = new Set(result.map((r) => r.CQ_FILIAL));
    expect(filiais.has("00101001")).toBe(true);
    expect(filiais.has("010101")).toBe(true);
  });

  it("arrays vazios retornam vazio", () => {
    expect(expandCq0Rows([])).toEqual([]);
  });
});
