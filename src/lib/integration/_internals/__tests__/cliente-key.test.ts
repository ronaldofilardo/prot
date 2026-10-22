import { describe, it, expect } from "vitest";
import { clienteKey, normLoja } from "../cliente-key";

describe("cliente-key", () => {
  it("normaliza loja do Protheus (0001) para o formato curto (1)", () => {
    expect(normLoja("0001")).toBe("1");
    expect(normLoja("01")).toBe("1");
    expect(normLoja("1")).toBe("1");
  });

  it("mesma chave para loja '0001' (Protheus) e '01' (banco legado)", () => {
    expect(clienteKey("000001", "0001")).toBe(clienteKey("000001", "01"));
    expect(clienteKey("000001", "0001")).toBe("000001|1");
  });

  it("preserva o codigo exato para nao colidir '001' com '000001'", () => {
    expect(clienteKey("001", "01")).not.toBe(clienteKey("000001", "01"));
    expect(clienteKey(" 000001 ", " 0001 ")).toBe("000001|1");
  });

  it("loja vazia ou ausente vira o default '1' (Protheus '01')", () => {
    expect(normLoja("")).toBe("1");
    expect(normLoja(undefined)).toBe("1");
    expect(normLoja(null)).toBe("1");
    expect(normLoja("  ")).toBe("1");
  });

  it("colapsa valor so de zeros de forma consistente", () => {
    expect(normLoja("0000")).toBe(normLoja("0"));
    expect(clienteKey("000001", "0000")).toBe(clienteKey("000001", "0"));
  });
});
