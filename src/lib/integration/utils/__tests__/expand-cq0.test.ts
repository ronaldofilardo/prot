import { describe, it, expect } from "vitest";
import { expandCq0ToLong, expandCq0Rows } from "../expand-cq0";

function cq0Row(overrides: Record<string, string> = {}): Record<string, string> {
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

describe("expandCq0ToLong", () => {
  it("retorna [] para linha sem filial e sem conta", () => {
    expect(expandCq0ToLong({})).toEqual([]);
  });

  it("retorna a própria linha se já estiver no formato longo (tem CQ_MES)", () => {
    const longRow = { CQ_FILIAL: "01", CQ_CONTA: "1101", CQ_MES: "03", CQ_ANO: "2026" };
    expect(expandCq0ToLong(longRow)).toEqual([longRow]);
  });

  it("retorna [] quando moeda diferente de 01", () => {
    expect(expandCq0ToLong(cq0Row({ CQ0_MOEDA: "02" }))).toEqual([]);
  });

  it("retorna [] quando tipo de saldo diferente de 1", () => {
    expect(expandCq0ToLong(cq0Row({ CQ0_TPSALD: "2" }))).toEqual([]);
  });

  it("retorna [] quando não há CQ0_ANO", () => {
    const { CQ0_ANO: _omitted, ...rest } = cq0Row();
    expect(expandCq0ToLong(rest)).toEqual([]);
  });

  it("expande 1 linha wide em linhas por mês com movimento", () => {
    const result = expandCq0ToLong(cq0Row());
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
    const row = cq0Row({
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
    const row = cq0Row({
      CQ0_DEB01: "0", CQ0_CRE01: "0", CQ0_SLD01: "0",
      CQ0_SLDANT: "500.00",
    });
    const result = expandCq0ToLong(row);
    const jan = result.find((r) => r.CQ_MES === "01");
    expect(jan).toBeDefined();
    expect(jan!.CQ_SALANT).toBe("500");
  });

  it("pula meses sem movimento e sem saldo", () => {
    const row = cq0Row({
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
  it("expande múltiplas linhas", () => {
    const rows = [
      cq0Row(),
      cq0Row({ CQ0_FILIAL: "020202", CQ0_CONTA: "220202" }),
    ];
    const result = expandCq0Rows(rows);
    const filiais = new Set(result.map((r) => r.CQ_FILIAL));
    expect(filiais.has("010101")).toBe(true);
    expect(filiais.has("020202")).toBe(true);
  });

  it("arrays vazios retornam vazio", () => {
    expect(expandCq0Rows([])).toEqual([]);
  });
});
