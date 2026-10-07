import { describe, it, expect } from "vitest";
import {
  parseClienteExternalId,
  parseFaturamentoExternalId,
  parseContaReceberExternalId,
  parseBaixaExternalId,
  parseSaldoContabilExternalId,
} from "../sync-parsers";

describe("sync-parsers.ts", () => {
  describe("parseClienteExternalId", () => {
    it("parseia externalId com padrão -CLI-", () => {
      const result = parseClienteExternalId("emp-01-CLI-000001-01");
      expect(result).toEqual({ codigo: "000001", loja: "01" });
    });

    it("parseia externalId com código vazio", () => {
      const result = parseClienteExternalId("emp-01-CLI--01");
      expect(result).toEqual({ codigo: "", loja: "01" });
    });

    it("parseia externalId com loja vazia", () => {
      const result = parseClienteExternalId("emp-01-CLI-000001-");
      expect(result).toEqual({ codigo: "000001", loja: "01" });
    });

    it("usa fallback quando padrão não encontrado", () => {
      const result = parseClienteExternalId("emp-01-000001-01");
      expect(result).toEqual({ codigo: "emp", loja: "01" });
    });

    it("usa fallback com partes faltando", () => {
      const result = parseClienteExternalId("emp-01");
      expect(result).toEqual({ codigo: "emp", loja: "01" });
    });

    it("usa fallback com string vazia", () => {
      const result = parseClienteExternalId("");
      expect(result).toEqual({ codigo: "", loja: "01" });
    });
  });

  describe("parseFaturamentoExternalId", () => {
    it("parseia externalId com padrão -NF-", () => {
      const result = parseFaturamentoExternalId("emp-01-NF-01-000001");
      expect(result).toEqual({ filial: "01", numeroNota: "000001" });
    });

    it("parseia externalId com filial vazia", () => {
      const result = parseFaturamentoExternalId("emp-01-NF--000001");
      expect(result).toEqual({ filial: "01", numeroNota: "000001" });
    });

    it("parseia externalId com numeroNota vazio", () => {
      const result = parseFaturamentoExternalId("emp-01-NF-01-");
      expect(result).toEqual({ filial: "01", numeroNota: "" });
    });

    it("usa fallback quando padrão não encontrado", () => {
      const result = parseFaturamentoExternalId("emp-01-01-000001");
      expect(result).toEqual({ filial: "emp", numeroNota: "01" });
    });

    it("usa fallback com partes faltando", () => {
      const result = parseFaturamentoExternalId("emp-01");
      expect(result).toEqual({ filial: "emp", numeroNota: "01" });
    });

    it("usa fallback com string vazia", () => {
      const result = parseFaturamentoExternalId("");
      expect(result).toEqual({ filial: "01", numeroNota: "" });
    });
  });

  describe("parseContaReceberExternalId", () => {
    it("parseia externalId com padrão -CR-", () => {
      const result = parseContaReceberExternalId("emp-01-CR-01-FAT-000001-A");
      expect(result).toEqual({ filial: "01", prefixo: "FAT", numero: "000001", parcela: "A" });
    });

    it("parseia externalId com campos vazios", () => {
      const result = parseContaReceberExternalId("emp-01-CR---A");
      expect(result).toEqual({ filial: "01", prefixo: "", numero: "A", parcela: "" });
    });

    it("usa fallback quando padrão não encontrado", () => {
      const result = parseContaReceberExternalId("emp-01-01-FAT-000001-A");
      expect(result).toEqual({ filial: "emp", prefixo: "01", numero: "01", parcela: "FAT" });
    });

    it("usa fallback com partes faltando", () => {
      const result = parseContaReceberExternalId("emp-01");
      expect(result).toEqual({ filial: "emp", prefixo: "01", numero: "", parcela: "" });
    });

    it("usa fallback com string vazia", () => {
      const result = parseContaReceberExternalId("");
      expect(result).toEqual({ filial: "01", prefixo: "", numero: "", parcela: "" });
    });
  });

  describe("parseBaixaExternalId", () => {
    it("parseia externalId com padrão -BX-", () => {
      const result = parseBaixaExternalId("emp-01-BX-01-FAT-000001-A");
      expect(result).toEqual({ filial: "01", prefixo: "FAT", numero: "000001", parcela: "A" });
    });

    it("parseia externalId com campos vazios", () => {
      const result = parseBaixaExternalId("emp-01-BX---A");
      expect(result).toEqual({ filial: "01", prefixo: "", numero: "A", parcela: "" });
    });

    it("usa fallback quando padrão não encontrado", () => {
      const result = parseBaixaExternalId("emp-01-01-FAT-000001-A");
      expect(result).toEqual({ filial: "emp", prefixo: "01", numero: "01", parcela: "FAT" });
    });

    it("usa fallback com partes faltando", () => {
      const result = parseBaixaExternalId("emp-01");
      expect(result).toEqual({ filial: "emp", prefixo: "01", numero: "", parcela: "" });
    });

    it("usa fallback com string vazia", () => {
      const result = parseBaixaExternalId("");
      expect(result).toEqual({ filial: "01", prefixo: "", numero: "", parcela: "" });
    });
  });

  describe("parseSaldoContabilExternalId", () => {
    it("parseia externalId com padrão -SC-", () => {
      const result = parseSaldoContabilExternalId("emp-01-SC-01-1000-2024-01");
      expect(result).toEqual({ filial: "01", conta: "1000", competencia: "2024-01" });
    });

    it("parseia externalId com conta contendo hífens", () => {
      const result = parseSaldoContabilExternalId("emp-01-SC-01-1.1.001-2024-01");
      expect(result).toEqual({ filial: "01", conta: "1.1.001", competencia: "2024-01" });
    });

    it("parseia externalId com conta complexa", () => {
      const result = parseSaldoContabilExternalId("emp-01-SC-01-1.2.3.4-2024-12");
      expect(result).toEqual({ filial: "01", conta: "1.2.3.4", competencia: "2024-12" });
    });

    it("usa fallback quando padrão não encontrado", () => {
      const result = parseSaldoContabilExternalId("emp-01-01-1000-2024-01");
      expect(result).toEqual({ filial: "emp", conta: "01", competencia: "01-1000" });
    });

    it("usa fallback com partes faltando", () => {
      const result = parseSaldoContabilExternalId("emp-01");
      expect(result).toEqual({ filial: "emp", conta: "01", competencia: "0000-00" });
    });

    it("usa fallback com apenas empresa e filial", () => {
      const result = parseSaldoContabilExternalId("emp-01-01");
      expect(result).toEqual({ filial: "emp", conta: "01", competencia: "01-00" });
    });

    it("usa fallback com string vazia", () => {
      const result = parseSaldoContabilExternalId("");
      expect(result).toEqual({ filial: "01", conta: "", competencia: "0000-00" });
    });
  });
});