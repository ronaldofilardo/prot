import { describe, it, expect } from "vitest";
import {
  buildFallbackClientesRows,
  buildFallbackFaturamentosRows,
  buildFallbackContasReceberRows,
  buildFallbackContasPagarRows,
  buildFallbackFilial,
} from "../rest-mock";

describe("rest-mock.ts", () => {
  describe("buildFallbackClientesRows", () => {
    it("retorna array vazio quando nenhum cliente é retornado", () => {
      const rows = buildFallbackClientesRows();
      expect(rows).toEqual([]);
    });
  });

  describe("buildFallbackFaturamentosRows", () => {
    it("retorna array vazio para evitar injeção de faturamento fake", () => {
      const rows = buildFallbackFaturamentosRows();
      expect(rows).toEqual([]);
    });
  });

  describe("buildFallbackContasReceberRows", () => {
    it("retorna array vazio para evitar injeção de contas a receber fake", () => {
      const rows = buildFallbackContasReceberRows();
      expect(rows).toEqual([]);
    });
  });

  describe("buildFallbackContasPagarRows", () => {
    it("retorna array vazio para evitar injeção de contas a pagar fake", () => {
      const rows = buildFallbackContasPagarRows();
      expect(rows).toEqual([]);
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
        nome: "Filial 001",
        tipo: "Filial",
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
        nome: "Filial 02",
        tipo: "Filial",
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
        nome: "Filial 001",
        tipo: "Filial",
        status: "Ativa",
      });
    });

    it("trima espaços da filial", () => {
      const result = buildFallbackFilial("emp-01", "  00101001  ");
      expect(result.filialCompleta).toBe("00101001");
    });
  });
});