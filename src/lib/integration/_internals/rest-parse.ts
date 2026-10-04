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
  url.searchParams.set("empresa", config.empresaId);
  url.searchParams.set("filial", config.filial);
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

function extractRows(json: unknown): ProtheusRow[] {
  if (Array.isArray(json)) return json as ProtheusRow[];
  const obj = json as { items?: ProtheusRow[]; data?: ProtheusRow[] };
  return obj.items ?? obj.data ?? [];
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

export function mapEmpresaInfo(rows: ProtheusRow[], config: UrlConfig): ProtheusEmpresaInfo {
  const target = selectEmpresaRow(rows, config.empresaId, config.filial);
  return {
    nome: firstTruthy(
      target.name,
      target.nome,
      target.razaoSocial,
      target.A1_NOME,
      target.M0_NOME,
      target.M0_NOMECOM,
      "Empresa Protheus"
    ),
    cnpj: firstTruthy(target.cgc, target.cnpj, target.A1_CGC, target.M0_CGC),
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
    row.branchId,
    row.codigoFilial,
    row.filial,
    row.codigo,
    String(idx + 1).padStart(2, "0")
  );
  const nome = firstTruthy(row.name, row.nome, row.razaoSocial, `Filial ${codFil}`);
  const cnpj = firstTruthy(row.cgc, row.cnpj);
  const isMatriz = codFil === "01" || codFil === "0001" || nome.toUpperCase().includes("MATRIZ");
  return {
    codigoEmpresa: firstTruthy(row.companyId, row.codigoEmpresa, empresaId),
    codigoFilial: codFil,
    nome,
    cnpj,
    tipo: isMatriz ? "Matriz" : "Filial",
    cidade: firstTruthy(row.city, row.cidade),
    uf: firstTruthy(row.state, row.uf),
    status: "Ativa",
  };
}
