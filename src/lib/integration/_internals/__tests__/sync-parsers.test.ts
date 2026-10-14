import { describe, it, expect } from "vitest";
import { parseSaldoContabilExternalId } from "../sync-parsers";

describe("parseSaldoContabilExternalId (sync-parsers.ts)", () => {
  it("parseia externalId com padrão -SC-", () => {
    const result = parseSaldoContabilExternalId("emp-01-SC-01-1000-2024-01");
    expect(result).toEqual({ filial: "01", conta: "1000", competencia: "2024-01" });
  });

  it("parseia externalId com conta contendo hífens", () => {
    const result = parseSaldoContabilExternalId("emp-01-SC-01-1.1.001-2024-01");
    expect(result).toEqual({ filial: "01", conta: "1.1.001", competencia: "2024-01" });
  });

  it("parseia externalId sem padrão -SC- (fallback)", () => {
    const result = parseSaldoContabilExternalId("emp-01-01-1000-2024-01");
    expect(result).toEqual({ filial: "emp", conta: "01", competencia: "01-1000" });
  });

  it("parseia externalId com partes faltando (fallback)", () => {
    const result = parseSaldoContabilExternalId("emp-01");
    expect(result).toEqual({ filial: "emp", conta: "01", competencia: "0000-00" });
  });

  it("parseia externalId apenas com filial (fallback)", () => {
    const result = parseSaldoContabilExternalId("emp-01-01");
    expect(result).toEqual({ filial: "emp", conta: "01", competencia: "01-00" });
  });
});
