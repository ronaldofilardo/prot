import { describe, it, expect } from "vitest";
import {
  buildFallbackClientesRows,
  buildFallbackFaturamentosRows,
  buildFallbackContasReceberRows,
  buildFallbackFilial,
} from "../rest-mock";

describe("rest-mock.ts", () => {
  describe("buildFallbackClientesRows", () => {
    it("retorna array com cliente de teste", () => {
      const rows = buildFallbackClientesRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        A1_COD: "000001",
        A1_LOJA: "01",
        A1_NOME: "CLIENTE TESTE LC1",
        A1_MUN: "SAO PAULO",
        A1_EST: "SP",
        D_E_L_E_T_: "",
      });
    });
  });

  describe("buildFallbackFaturamentosRows", () => {
    it("retorna array com faturamento de teste", () => {
      const rows = buildFallbackFaturamentosRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].F2_DOC).toBe("000000001");
      expect(rows[0].F2_SERIE).toBe("1");
      expect(rows[0].F2_CLIENTE).toBe("000001");
      expect(rows[0].F2_LOJA).toBe("01");
      expect(rows[0].D_E_L_E_T_).toBe("");
      expect(rows[0].F2_VALOR).toBe("5000.00");
    });
  });

  describe("buildFallbackContasReceberRows", () => {
    it("retorna array com conta a receber de teste", () => {
      const rows = buildFallbackContasReceberRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].E1_PREFIXO).toBe("1");
      expect(rows[0].E1_NUM).toBe("000000001");
      expect(rows[0].E1_PARCELA).toBe("1");
      expect(rows[0].E1_CLIENTE).toBe("000001");
      expect(rows[0].E1_LOJA).toBe("01");
      expect(rows[0].D_E_L_E_T_).toBe("");
      expect(rows[0].E1_VALOR).toBe("5000.00");
      expect(rows[0].E1_SALDO).toBe("5000.00");
    });
  });

  describe("buildFallbackFilial", () => {
    it("parseia filial de 8 caracteres corretamente", () => {
      const result = buildFallbackFilial("emp-01", "00101001");
      expect(result).toEqual({
        codigoEmpresa: "001",
        codigoUnidade: "01",
        codigoFilial: "001",
        filialCompleta: "00101001",
        nome: "LC1 CONTADORES - MATRIZ",
        tipo: "Matriz",
        status: "Ativa",
      });
    });

    it("usa empresaId quando filial não tem 8 caracteres", () => {
      const result = buildFallbackFilial("emp-02", "02");
      expect(result).toEqual({
        codigoEmpresa: "emp-02",
        codigoUnidade: "01",
        codigoFilial: "02",
        filialCompleta: "02",
        nome: "LC1 CONTADORES - MATRIZ",
        tipo: "Matriz",
        status: "Ativa",
      });
    });

    it("usa empresaId padrão quando filial vazia", () => {
      const result = buildFallbackFilial("", "");
      expect(result).toEqual({
        codigoEmpresa: "001",
        codigoUnidade: "01",
        codigoFilial: "001",
        filialCompleta: "00101001",
        nome: "LC1 CONTADORES - MATRIZ",
        tipo: "Matriz",
        status: "Ativa",
      });
    });

    it("trima espaços da filial", () => {
      const result = buildFallbackFilial("emp-01", "  00101001  ");
      expect(result.filialCompleta).toBe("00101001");
    });
  });
});