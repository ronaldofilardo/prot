import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  csvRowToCanonicalCliente,
  csvRowToCanonicalFaturamento,
  csvRowToCanonicalContaReceber,
  csvRowToCanonicalBaixa,
  csvRowToCanonicalSaldoContabil,
} from "../protheus-adapter";

const AGORA = "2026-10-04T12:00:00.000Z";

describe("protheus-adapter — caracterização (linha Protheus → Canonical)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(AGORA));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("csvRowToCanonicalCliente", () => {
    it("monta externalId composto e aplica trim em todos os campos", () => {
      const result = csvRowToCanonicalCliente(
        {
          A1_COD: " 000001 ",
          A1_LOJA: " 01 ",
          A1_NOME: " CLIENTE TESTE ",
          A1_MUN: " SAO PAULO ",
          A1_EST: " SP ",
        },
        "empresa-01"
      );

      expect(result).toEqual({
        externalId: "empresa-01-CLI-000001-01",
        company: "empresa-01",
        branch: "01",
        name: "CLIENTE TESTE",
        city: "SAO PAULO",
        state: "SP",
        active: true,
        updatedAt: AGORA,
      });
    });

    it("usa defaults para campos ausentes (comportamento atual preservado)", () => {
      const result = csvRowToCanonicalCliente({}, "empresa-01");

      expect(result).toEqual({
        // Comportamento atual: campos ausentes viram "undefined" na string.
        externalId: "empresa-01-CLI-undefined-undefined",
        company: "empresa-01",
        branch: "01",
        name: "",
        city: "",
        state: "",
        active: true,
        updatedAt: AGORA,
      });
    });

    it("marca active=false quando a linha está marcada como deletada (D_E_L_E_T_='*')", () => {
      const result = csvRowToCanonicalCliente(
        { A1_COD: "000002", A1_LOJA: "01", D_E_L_E_T_: "*" },
        "empresa-01"
      );

      expect(result.active).toBe(false);
      expect(result.externalId).toBe("empresa-01-CLI-000002-01");
    });
  });

  describe("csvRowToCanonicalFaturamento", () => {
    it("monta invoice e vincula partyExternalId pelo cliente/loja", () => {
      const result = csvRowToCanonicalFaturamento(
        {
          F2_FILIAL: "01",
          F2_DOC: "000100",
          F2_CLIENTE: "000001",
          F2_LOJA: "01",
          F2_EMISSAO: "20260115",
          F2_VALOR: "1500.75",
        },
        "empresa-01"
      );

      expect(result).toEqual({
        externalId: "empresa-01-NF-01-000100",
        company: "empresa-01",
        branch: "01",
        documentNumber: "000100",
        partyExternalId: "empresa-01-CLI-000001-01",
        issueDate: "2026-01-15T00:00:00.000Z",
        amount: 1500.75,
        currency: "BRL",
        updatedAt: AGORA,
      });
    });

    it("cai para a data atual quando a data Protheus é vazia ou não tem 8 dígitos", () => {
      const vazia = csvRowToCanonicalFaturamento({ F2_EMISSAO: "" }, "empresa-01");
      const curta = csvRowToCanonicalFaturamento({ F2_EMISSAO: "2026" }, "empresa-01");

      expect(vazia.issueDate).toBe(AGORA);
      expect(curta.issueDate).toBe(AGORA);
    });

    it("usa amount 0 quando F2_VALOR não é numérico", () => {
      const result = csvRowToCanonicalFaturamento({ F2_VALOR: "ABC" }, "empresa-01");

      expect(result.amount).toBe(0);
    });
  });

  describe("csvRowToCanonicalContaReceber", () => {
    it("monta título com chaves de idempotência e datas convertidas", () => {
      const result = csvRowToCanonicalContaReceber(
        {
          E1_FILIAL: "01",
          E1_PREFIXO: "FAT",
          E1_NUM: "000100",
          E1_PARCELA: "A",
          E1_TIPO: "NCC",
          E1_CLIENTE: "000001",
          E1_LOJA: "01",
          E1_EMISSAO: "20260110",
          E1_VENCTO: "20260210",
          E1_VALOR: "350.5",
        },
        "empresa-01"
      );

      expect(result).toEqual({
        externalId: "empresa-01-CR-01-FAT-000100-A",
        company: "empresa-01",
        branch: "01",
        prefix: "FAT",
        number: "000100",
        installment: "A",
        type: "NCC",
        partyExternalId: "empresa-01-CLI-000001-01",
        issueDate: "2026-01-10T00:00:00.000Z",
        dueDate: "2026-02-10T00:00:00.000Z",
        amount: 350.5,
        currency: "BRL",
        status: "open",
        updatedAt: AGORA,
      });
    });

    it("usa type 'DUP' como padrão e data atual no vencimento inválido", () => {
      const result = csvRowToCanonicalContaReceber({ E1_VENCTO: "10/02/2026" }, "empresa-01");

      expect(result.type).toBe("DUP");
      expect(result.dueDate).toBe(AGORA);
      expect(result.status).toBe("open");
      expect(result.amount).toBe(0);
    });
  });

  describe("csvRowToCanonicalBaixa", () => {
    it("monta baixa e aponta titleExternalId para o mesmo título (CR)", () => {
      const result = csvRowToCanonicalBaixa(
        {
          E5_FILIAL: "01",
          E5_FILBAI: "02",
          E5_PREFIXO: "FAT",
          E5_NUM: "000100",
          E5_PARCELA: "A",
          E5_TIPO: "DUP",
          E5_VALOR: "350.5",
          E5_BAIXA: "20260120",
        },
        "empresa-01"
      );

      expect(result).toEqual({
        externalId: "empresa-01-BX-01-FAT-000100-A-20260120",
        company: "empresa-01",
        branch: "01",
        paymentBranch: "02",
        prefix: "FAT",
        number: "000100",
        installment: "A",
        type: "DUP",
        amount: 350.5,
        paymentDate: "2026-01-20T00:00:00.000Z",
        titleExternalId: "empresa-01-CR-01-FAT-000100-A",
        updatedAt: AGORA,
      });
    });

    it("usa paymentBranch '01' e data atual quando campos de baixa estão ausentes", () => {
      const result = csvRowToCanonicalBaixa({ E5_BAIXA: "20261" }, "empresa-01");

      expect(result.paymentBranch).toBe("01");
      expect(result.paymentDate).toBe(AGORA);
      expect(result.amount).toBe(0);
    });
  });

  describe("csvRowToCanonicalSaldoContabil", () => {
    it("monta saldo contabil com chaves e fallback de campos", () => {
      const result = csvRowToCanonicalSaldoContabil(
        {
          CQ_FILIAL: "01",
          CQ_CONTA: "1101",
          CQ_ANO: "2026",
          CQ_MES: "01",
          CQ_SALANT: "100.5",
          CQ_DEB: "50",
          CQ_CRED: "20.5",
          CQ_SALDO: "130",
        },
        "empresa-01"
      );

      expect(result).toEqual({
        externalId: "empresa-01-SC-01-1101-2026-01",
        company: "empresa-01",
        branch: "01",
        account: "1101",
        period: "2026-01",
        fiscalYear: "2026",
        previousBalance: 100.5,
        debits: 50,
        credits: 20.5,
        currentBalance: 130,
        updatedAt: AGORA,
      });
    });

    it("usa fallback de campos alternativos (CQ_SALDOA, CQ_SALDOF)", () => {
      const result = csvRowToCanonicalSaldoContabil(
        {
          CQ_SALDOA: "10",
          CQ_SALDOF: "20",
        },
        "empresa-01"
      );
      expect(result.previousBalance).toBe(10);
      expect(result.currentBalance).toBe(20);
    });

    it("formata competencia pela CQ_DATA se CQ_MES/ANO faltarem", () => {
      const result = csvRowToCanonicalSaldoContabil({ CQ_DATA: "20260315" }, "empresa-01");
      expect(result.period).toBe("2026-03");
      expect(result.fiscalYear).toBe("2026");
    });
  });
});
