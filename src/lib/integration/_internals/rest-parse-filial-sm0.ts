import type { ProtheusFilialInfo, ProtheusRow } from "../protheus-client";
import { formatCnpjOuCpf } from "./rest-parse-empresa";
import { firstTruthy } from "./rest-parse-url";

const soDigitos = (v: string) => v.replace(/\D/g, "");

function decompor(grupo: string, codFil: string) {
  if (codFil.length === 8) {
    return {
      codigoEmpresa: codFil.substring(0, 3),
      codigoUnidade: codFil.substring(3, 5),
      codigoFilial: codFil.substring(5, 8),
      filialCompleta: codFil,
    };
  }
  return { codigoEmpresa: grupo, codigoUnidade: undefined, codigoFilial: codFil, filialCompleta: codFil };
}

/** Matriz = CNPJ com ordem 0001 (posições 9-12). */
function cnpjDeMatriz(cnpjBruto: string): boolean {
  const d = soDigitos(cnpjBruto);
  return d.length === 14 && d.slice(8, 12) === "0001";
}

export function mapSm0Row(row: ProtheusRow, idx: number, empresaPadrao: string): ProtheusFilialInfo {
  const grupo = firstTruthy(row.M0_CODIGO, row.codigoEmpresa, empresaPadrao).trim();
  const codFil = firstTruthy(row.M0_CODFIL, row.codigoFilial, row.branchId, row.filial, row.codigo, row.CDFILIAL, String(idx + 1).padStart(2, "0")).trim();
  const razao = firstTruthy(row.M0_NOMECOM, row.M0_NOME, row.name, row.nome, row.razaoSocial, row.CDFILDESC).trim();
  const nomeFilial = firstTruthy(row.M0_FILIAL, row.branchName).trim();
  const cnpjBruto = firstTruthy(row.M0_CGC, row.cgc, row.cnpj).trim();
  const nome = razao || nomeFilial || `Filial ${codFil}`;

  return {
    ...decompor(grupo, codFil),
    nome,
    ...(nomeFilial && nomeFilial !== nome ? { nomeFilial } : {}),
    cnpj: cnpjBruto ? formatCnpjOuCpf(cnpjBruto) : "",
    tipo: cnpjDeMatriz(cnpjBruto) ? "Matriz" : "Filial",
    cidade: firstTruthy(row.M0_CIDENT, row.cidade, row.city).trim() || undefined,
    uf: firstTruthy(row.M0_ESTENT, row.uf, row.state).trim() || undefined,
    status: "Ativa",
  };
}

function chaveFilial(f: ProtheusFilialInfo): string {
  return `${f.codigoEmpresa}|${f.filialCompleta}`;
}

/** Mapeia, remove duplicadas, ordena e garante uma matriz por grupo. */
export function mapSm0Rows(rows: ProtheusRow[], empresaPadrao: string): ProtheusFilialInfo[] {
  const unicas = new Map<string, ProtheusFilialInfo>();
  rows.forEach((row, idx) => {
    const f = mapSm0Row(row, idx, empresaPadrao);
    if (!unicas.has(chaveFilial(f))) unicas.set(chaveFilial(f), f);
  });
  const lista = Array.from(unicas.values()).sort((a, b) =>
    chaveFilial(a).localeCompare(chaveFilial(b), "pt-BR", { numeric: true })
  );
  const grupos = new Set(lista.map((f) => f.codigoEmpresa));
  for (const g of grupos) {
    const doGrupo = lista.filter((f) => f.codigoEmpresa === g);
    const semMatriz = !doGrupo.some((f) => f.tipo === "Matriz");
    const semCnpjValido = doGrupo.every((f) => soDigitos(f.cnpj ?? "").length !== 14);
    // Sem CNPJ para identificar a matriz, assume a de menor codigo do grupo.
    if (semMatriz && semCnpjValido) doGrupo[0].tipo = "Matriz";
  }
  return lista;
}
