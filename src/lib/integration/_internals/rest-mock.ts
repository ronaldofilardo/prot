import type { ProtheusFilialInfo, ProtheusRow } from "../protheus-client";

export function buildFallbackClientesRows(): ProtheusRow[] {
  return [{ A1_COD: "000001", A1_LOJA: "01", A1_NOME: "CLIENTE TESTE LC1", A1_MUN: "SAO PAULO", A1_EST: "SP", D_E_L_E_T_: "" }];
}

export function buildFallbackFaturamentosRows(): ProtheusRow[] {
  return [{ F2_DOC: "000000001", F2_SERIE: "1", F2_CLIENTE: "000001", F2_LOJA: "01", F2_EMISSAO: new Date().toISOString().split("T")[0].replace(/-/g, ""), F2_VALOR: "5000.00", D_E_L_E_T_: "" }];
}

export function buildFallbackContasReceberRows(): ProtheusRow[] {
  return [{ E1_PREFIXO: "1", E1_NUM: "000000001", E1_PARCELA: "1", E1_CLIENTE: "000001", E1_LOJA: "01", E1_EMISSAO: new Date().toISOString().split("T")[0].replace(/-/g, ""), E1_VENCTO: new Date().toISOString().split("T")[0].replace(/-/g, ""), E1_VALOR: "5000.00", E1_SALDO: "5000.00", D_E_L_E_T_: "" }];
}

export function buildFallbackFilial(empresaId: string, filial: string): ProtheusFilialInfo {
  return {
    codigoEmpresa: empresaId || "001",
    codigoFilial: filial || "00101001",
    nome: "LC1 CONTADORES - MATRIZ",
    tipo: "Matriz",
    status: "Ativa",
  };
}
