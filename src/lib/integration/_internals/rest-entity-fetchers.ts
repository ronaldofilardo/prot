import type { ProtheusEmpresaInfo, ProtheusFilialInfo, ProtheusRow } from "../protheus-client";
import { buildFallbackClientesRows, buildFallbackContasReceberRows, buildFallbackFaturamentosRows, buildFallbackFilial } from "./rest-mock";
import { mapEmpresaInfo, mapRowToFilial } from "./rest-parse";
import {
  BAIXAS_FALLBACK_PATHS,
  CLIENTES_FALLBACK_PATHS,
  CONTAS_RECEBER_FALLBACK_PATHS,
  EMPRESA_FALLBACK_PATHS,
  FATURAMENTOS_FALLBACK_PATHS,
  FILIAIS_FALLBACK_PATHS,
  SALDOS_CONTABEIS_FALLBACK_PATHS,
  buildCandidatePaths,
} from "./rest-paths";
import {
  fetchFirstNonEmptyOrThrow,
  fetchFirstNonEmptySwallowingErrors,
  fetchRowsFromFirstPath,
} from "./rest-retry";
import type { ProtheusRestConfig } from "./rest-types";

export function mergeAndDedupe(rows: ProtheusRow[], keys: string[]): ProtheusRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = keys.map((k) => row[k] ?? "").join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchEmpresa(
  config: ProtheusRestConfig,
  customPath: string | undefined,
  getRows: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusEmpresaInfo | null> {
  const candidatePaths = buildCandidatePaths(customPath, [
    config.paths.empresa,
    process.env.PROTHEUS_REST_EMPRESA_PATH,
    ...EMPRESA_FALLBACK_PATHS,
  ]);
  const rows = await fetchFirstNonEmptyOrThrow(candidatePaths, getRows);
  if (!rows) return null;
  return mapEmpresaInfo(rows, config);
}

export async function fetchFiliais(
  config: ProtheusRestConfig,
  customPath: string | undefined,
  getRows: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusFilialInfo[]> {
  const candidatePaths = buildCandidatePaths(customPath, [
    process.env.PROTHEUS_REST_FILIAIS_PATH,
    ...FILIAIS_FALLBACK_PATHS,
  ]);
  const rows = await fetchFirstNonEmptySwallowingErrors(candidatePaths, getRows);
  if (!rows || rows.length === 0) {
    return [buildFallbackFilial(config.empresaId, config.filial)];
  }
  const filiais = rows.map((row, idx) => mapRowToFilial(row, idx, config.empresaId));
  const unique = new Map<string, ProtheusFilialInfo>();
  for (const f of filiais) {
    const key = f.id || `${f.codigoEmpresa}-${f.codigoFilial}-${f.cnpj || f.nome}-${f.filialCompleta}`;
    if (!unique.has(key)) {
      unique.set(key, f);
    }
  }
  return Array.from(unique.values());
}

export async function fetchClientes(
  config: ProtheusRestConfig,
  customPath: string | undefined,
  getRows: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusRow[]> {
  const candidatePaths = buildCandidatePaths(customPath, [
    config.paths.clientes,
    process.env.PROTHEUS_REST_CLIENTES_PATH,
    ...CLIENTES_FALLBACK_PATHS,
  ]);
  const rows = await fetchRowsFromFirstPath(candidatePaths, getRows, buildFallbackClientesRows);
  return mergeAndDedupe(rows, ["A1_COD", "A1_LOJA"]);
}

export async function fetchFaturamentos(
  config: ProtheusRestConfig,
  customPath: string | undefined,
  getRows: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusRow[]> {
  const candidatePaths = buildCandidatePaths(customPath, [
    config.paths.faturamentos,
    process.env.PROTHEUS_REST_FATURAMENTOS_PATH,
    ...FATURAMENTOS_FALLBACK_PATHS,
  ]);
  const rows = await fetchRowsFromFirstPath(candidatePaths, getRows, buildFallbackFaturamentosRows);
  return mergeAndDedupe(rows, ["F2_DOC", "F2_SERIE", "F2_CLIENTE", "F2_LOJA"]);
}

export async function fetchContasReceber(
  config: ProtheusRestConfig,
  customPath: string | undefined,
  getRows: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusRow[]> {
  const candidatePaths = buildCandidatePaths(customPath, [
    config.paths.contasReceber,
    process.env.PROTHEUS_REST_CONTAS_RECEBER_PATH,
    ...CONTAS_RECEBER_FALLBACK_PATHS,
  ]);
  const rows = await fetchRowsFromFirstPath(candidatePaths, getRows, buildFallbackContasReceberRows);
  return mergeAndDedupe(rows, ["E1_PREFIXO", "E1_NUM", "E1_PARCELA", "E1_CLIENTE", "E1_LOJA"]);
}

export async function fetchBaixas(
  config: ProtheusRestConfig,
  customPath: string | undefined,
  getRows: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusRow[]> {
  const candidatePaths = buildCandidatePaths(customPath, [
    config.paths.baixas,
    process.env.PROTHEUS_REST_BAIXAS_PATH,
    ...BAIXAS_FALLBACK_PATHS,
  ]);
  const rows = await fetchRowsFromFirstPath(candidatePaths, getRows, () => []);
  return mergeAndDedupe(rows, ["E5_PREFIXO", "E5_NUM", "E5_PARCELA", "E5_CLIENTE", "E5_LOJA", "E5_SEQ"]);
}

export async function fetchSaldosContabeis(
  config: ProtheusRestConfig,
  customPath: string | undefined,
  getRows: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusRow[]> {
  const candidatePaths = buildCandidatePaths(customPath, [
    config.paths.saldosContabeis,
    process.env.PROTHEUS_REST_SALDOS_CONTABEIS_PATH,
    ...SALDOS_CONTABEIS_FALLBACK_PATHS,
  ]);
  const rows = await fetchRowsFromFirstPath(candidatePaths, getRows, () => []);
  return mergeAndDedupe(rows, ["CQ_FILIAL", "CQ_CONTA", "CQ_MES", "CQ_ANO", "CQ_DATA"]);
}