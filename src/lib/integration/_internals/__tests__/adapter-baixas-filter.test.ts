import { describe, it, expect } from "vitest";
import { filterBaixasReceber } from "../adapter-baixas-filter";
import type { ProtheusRow } from "../../protheus-client";

describe("filterBaixasReceber", () => {
  it("mantém linhas com E5_RECPAG = 'R'", () => {
    const input: ProtheusRow[] = [
      { E5_NUMERO: "001", E5_RECPAG: "R", E5_VALOR: "100.00" },
      { E5_NUMERO: "002", E5_RECPAG: "r", E5_VALOR: "200.00" },
    ];
    const output = filterBaixasReceber(input);
    expect(output).toHaveLength(2);
    expect(output[0].E5_NUMERO).toBe("001");
  });

  it("descarta linhas com E5_RECPAG = 'P'", () => {
    const input: ProtheusRow[] = [
      { E5_NUMERO: "001", E5_RECPAG: "R", E5_VALOR: "100.00" },
      { E5_NUMERO: "002", E5_RECPAG: "P", E5_VALOR: "500.00" },
      { E5_NUMERO: "003", E5_RECPAG: "p", E5_VALOR: "300.00" },
    ];
    const output = filterBaixasReceber(input);
    expect(output).toHaveLength(1);
    expect(output[0].E5_NUMERO).toBe("001");
  });

  it("mantém linhas onde E5_RECPAG está ausente ou vazio (compatibilidade com mocks)", () => {
    const input: ProtheusRow[] = [
      { E5_NUMERO: "001", E5_VALOR: "100.00" },
      { E5_NUMERO: "002", E5_RECPAG: "", E5_VALOR: "200.00" },
    ];
    const output = filterBaixasReceber(input);
    expect(output).toHaveLength(2);
  });
});
