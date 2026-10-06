import { type ProtheusFilialInfo, type ProtheusRow } from "../protheus-client";
import { firstTruthy } from "./rest-parse-url";
import { formatCnpjOuCpf } from "./rest-parse-empresa";

const MATRIZ_CODES = new Set(["01", "0001", "00101001"]);

function checkIsMatriz(hasA1Nome: boolean, codFil: string, rawNome: string): boolean {
  if (hasA1Nome) return false;
  if (MATRIZ_CODES.has(codFil) || codFil.endsWith("01") || codFil.endsWith("001")) return true;
  return String(rawNome).toUpperCase().includes("MATRIZ");
}

function pickFilialCode(row: ProtheusRow, idx: number): string {
  return firstTruthy(
    row.A1_FILIAL,
    row.M0_CODFIL,
    row.M0_FILIAL,
    row.branchId,
    row.codigoFilial,
    row.filial,
    row.codigo,
    row.F2_FILIAL,
    row.B1_FILIAL,
    String(idx + 1).padStart(2, "0")
  );
}

function pickRawNome(row: ProtheusRow): string {
  return firstTruthy(
    row.A1_NOME,
    row.M0_NOME,
    row.M0_NOMECOM,
    row.name,
    row.nome,
    row.razaoSocial
  );
}

function pickCnpj(row: ProtheusRow): string {
  return firstTruthy(row.A1_CGC, row.M0_CGC, row.cgc, row.cnpj);
}

function pickCidade(row: ProtheusRow): string {
  return firstTruthy(row.A1_MUN, row.M0_CIDENT, row.city, row.cidade, "Curitiba");
}

function pickUf(row: ProtheusRow): string {
  return firstTruthy(row.A1_EST, row.M0_ESTENT, row.state, row.uf, "PR");
}

function pickId(row: ProtheusRow): string | undefined {
  return firstTruthy(row.A1_COD, row.id) || undefined;
}

function resolveEmpresaUnidadeFilial(codFil: string, empresaId: string) {
  let codigoEmpresa = empresaId;
  let codigoUnidade = "01";
  let codigoFilial = codFil;
  const filialCompleta = codFil;

  if (codFil.length === 8) {
    codigoEmpresa = codFil.substring(0, 3);
    codigoUnidade = codFil.substring(3, 5);
    codigoFilial = codFil.substring(5, 8);
  }

  return { codigoEmpresa, codigoUnidade, codigoFilial, filialCompleta };
}

function buildFilialInfo(
  row: ProtheusRow,
  idx: number,
  empresaId: string,
  codFil: string,
  rawNome: string,
  isMatriz: boolean,
): ProtheusFilialInfo {
  const nome = firstTruthy(rawNome, isMatriz ? "LC1 CONTADORES - MATRIZ" : `Filial ${codFil}`);
  const cnpj = pickCnpj(row) ? formatCnpjOuCpf(pickCnpj(row)) : "";
  const { codigoEmpresa, codigoUnidade, codigoFilial, filialCompleta } = resolveEmpresaUnidadeFilial(codFil, empresaId);
  const id = pickId(row);

  return {
    ...(id ? { id } : {}),
    codigoEmpresa,
    codigoUnidade,
    codigoFilial,
    filialCompleta,
    nome,
    cnpj,
    tipo: isMatriz ? "Matriz" : "Filial",
    cidade: pickCidade(row),
    uf: pickUf(row),
    status: "Ativa",
  };
}

export function mapRowToFilial(
  row: ProtheusRow,
  idx: number,
  empresaId: string
): ProtheusFilialInfo {
  const codFil = pickFilialCode(row, idx);
  const rawNome = pickRawNome(row);
  const hasA1Nome = Boolean(row.A1_NOME);
  const isMatriz = checkIsMatriz(hasA1Nome, codFil, rawNome);

  return buildFilialInfo(row, idx, empresaId, codFil, rawNome, isMatriz);
}