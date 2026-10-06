import {
  ProtheusClientError,
  type ProtheusEmpresaInfo,
  type ProtheusFilialInfo,
  type ProtheusRow,
} from "../protheus-client";
import type { ProtheusRestConfig } from "./rest-types";

type UrlConfig = Pick<ProtheusRestConfig, "baseUrl" | "empresaId" | "filial">;

export function firstTruthy(...values: Array<string | undefined | null>): string {
  return values.find((value) => value) ?? "";
}

export function buildRequestUrl(
  path: string,
  config: UrlConfig,
  settingName: string
): URL {
  let url: URL;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    url = new URL(path);
  } else if (path.startsWith("/") && !path.startsWith("//")) {
    url = new URL(path, config.baseUrl);
  } else {
    throw new ProtheusClientError(
      `${settingName} deve ser um caminho iniciado por "/" ou URL completa (https://...)`
    );
  }
  if (!url.pathname.includes("genericQuery")) {
    url.searchParams.set("empresa", config.empresaId);
    url.searchParams.set("filial", config.filial);
  }
  return url;
}

export async function readRows(response: Response, path: string): Promise<ProtheusRow[]> {
  assertOk(response, path);
  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new ProtheusClientError(`Resposta invalida (nao-JSON) de ${path}`, err);
  }
  return extractRows(json);
}

function assertOk(response: Response, path: string): void {
  if (!response.ok) {
    if (response.status === 404) {
      throw new ProtheusClientError(
        `Endpoint REST nao encontrado (404) em ${path}; confirme a rota publicada no Protheus`
      );
    }
    throw new ProtheusClientError(`Protheus REST retornou ${response.status} em ${path}`);
  }
}

function normalizeRow(row: ProtheusRow): ProtheusRow {
  const norm: ProtheusRow = {};
  for (const [k, v] of Object.entries(row)) {
    norm[k] = v;
    norm[k.toUpperCase()] = v;
    norm[k.toLowerCase()] = v;
  }
  return norm;
}

function extractRows(json: unknown): ProtheusRow[] {
  let raw: ProtheusRow[] = [];
  if (Array.isArray(json)) raw = json as ProtheusRow[];
  else {
    const obj = json as { items?: ProtheusRow[]; data?: ProtheusRow[] };
    raw = obj.items ?? obj.data ?? [];
  }
  return raw.map(normalizeRow);
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

export function mapEmpresaInfo(rows: ProtheusRow[], config: UrlConfig): ProtheusEmpresaInfo {
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

export function mapRowToFilial(
  row: ProtheusRow,
  idx: number,
  empresaId: string
): ProtheusFilialInfo {
  const codFil = firstTruthy(
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

  const rawNome = firstTruthy(
    row.A1_NOME,
    row.M0_NOME,
    row.M0_NOMECOM,
    row.name,
    row.nome,
    row.razaoSocial
  );

  const isMatriz =
    !row.A1_NOME &&
    (codFil === "01" ||
      codFil === "0001" ||
      codFil === "00101001" ||
      codFil.endsWith("01") ||
      codFil.endsWith("001") ||
      String(rawNome).toUpperCase().includes("MATRIZ"));

  const nome = firstTruthy(
    rawNome,
    isMatriz ? "LC1 CONTADORES - MATRIZ" : `Filial ${codFil}`
  );

  const rawCnpj = firstTruthy(row.A1_CGC, row.M0_CGC, row.cgc, row.cnpj);
  const cnpj = rawCnpj ? formatCnpjOuCpf(rawCnpj) : "";

  let codigoEmpresa = firstTruthy(row.M0_CODIGO, row.companyId, row.codigoEmpresa, empresaId);
  let codigoUnidade = "01";
  let codigoFilial = codFil;
  const filialCompleta = codFil;

  if (codFil.length === 8) {
    codigoEmpresa = codFil.substring(0, 3);
    codigoUnidade = codFil.substring(3, 5);
    codigoFilial = codFil.substring(5, 8);
  }

  const id = firstTruthy(row.A1_COD, row.id);

  return {
    ...(id ? { id } : {}),
    codigoEmpresa,
    codigoUnidade,
    codigoFilial,
    filialCompleta,
    nome,
    cnpj,
    tipo: isMatriz ? "Matriz" : "Filial",
    cidade: firstTruthy(row.A1_MUN, row.M0_CIDENT, row.city, row.cidade, "Curitiba"),
    uf: firstTruthy(row.A1_EST, row.M0_ESTENT, row.state, row.uf, "PR"),
    status: "Ativa",
  };
}
