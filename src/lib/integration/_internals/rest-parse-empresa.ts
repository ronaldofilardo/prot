import { type ProtheusEmpresaInfo, type ProtheusRow } from "../protheus-client";
import { firstTruthy } from "./rest-parse-url";

export function formatCnpjOuCpf(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return val;
}

function selectEmpresaRow(
  rows: ProtheusRow[],
  empresaId: string,
  filial: string
): ProtheusRow {
  const target = rows.find((r) => {
    const matchEmp = !r.companyId || r.companyId === empresaId;
    const matchFil = !r.branchId || r.branchId === filial;
    return matchEmp && matchFil;
  });
  return target || rows[0];
}

export function mapEmpresaInfo(
  rows: ProtheusRow[],
  config: { empresaId: string; filial: string }
): ProtheusEmpresaInfo {
  const target = selectEmpresaRow(rows, config.empresaId, config.filial);
  const rawCnpj = firstTruthy(target.A1_CGC, target.cgc, target.cnpj, target.M0_CGC);
  return {
    nome: firstTruthy(
      target.A1_NOME,
      target.name,
      target.nome,
      target.razaoSocial,
      target.M0_NOME,
      target.M0_NOMECOM,
      "Empresa Protheus"
    ),
    cnpj: rawCnpj ? formatCnpjOuCpf(rawCnpj) : "",
    codigoEmpresa: config.empresaId,
    codigoFilial: config.filial,
  };
}