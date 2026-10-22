import type { ProtheusRow } from "../protheus-client";
import type { PageResult } from "./rest-parse";

export type GetPageFn = (page: number, pageSize: number) => Promise<PageResult>;

import { logRestPageWarning } from "../logger";

const DEFAULT_DEADLINE_MS = 45_000;

function resolvePageSize(pageSize?: number): number {
  if (pageSize !== undefined) return pageSize;
  const envPageSize = Number(process.env.PROTHEUS_PAGE_SIZE);
  if (Number.isFinite(envPageSize) && envPageSize > 0) return envPageSize;
  return 100;
}

function resultadoSemLinhas(result: PageResult | null | undefined): boolean {
  return !result || !result.rows || result.rows.length === 0;
}

function primeiraLinhaDuplicada(page: number, atual: string, anterior: string | null): boolean {
  return page > 1 && atual === anterior;
}

function excedeuDeadline(startedAt: number, deadlineMs: number, page: number, linhas: number): boolean {
  const elapsed = Date.now() - startedAt;
  if (elapsed < deadlineMs) return false;
  logRestPageWarning("Deadline de paginacao atingido; retornando parcial", {
    page,
    pagesLidas: page - 1,
    linhas,
    elapsedMs: elapsed,
    deadlineMs,
  });
  return true;
}

function duplicataIgnorouPagina(page: number, atual: string, anterior: string | null, pageSize: number): boolean {
  if (!primeiraLinhaDuplicada(page, atual, anterior)) return false;
  logRestPageWarning("Servidor Protheus ignorou o parametro de pagina; encerrando paginacao.", { page, pageSize });
  return true;
}

function avisarSeAtingiuMaxPages(page: number, maxPages: number, pageSize: number): void {
  if (page > maxPages) {
    logRestPageWarning("Limite maximo de paginas atingido na paginacao REST", { maxPages, pageSize });
  }
}

export async function fetchAllPages(getPage: GetPageFn, options: { pageSize?: number; maxPages?: number; deadlineMs?: number } = {}): Promise<ProtheusRow[]> {
  const pageSize = resolvePageSize(options.pageSize);
  const maxPages = options.maxPages ?? 200;
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const startedAt = Date.now();
  const allRows: ProtheusRow[] = [];
  let page = 1;
  let previousFirstRowFingerprint: string | null = null;

  while (page <= maxPages) {
    if (excedeuDeadline(startedAt, deadlineMs, page, allRows.length)) break;

    const result = await getPage(page, pageSize);
    if (resultadoSemLinhas(result)) break;

    const currentFirstRow = JSON.stringify(result.rows[0]);
    if (duplicataIgnorouPagina(page, currentFirstRow, previousFirstRowFingerprint, pageSize)) break;
    previousFirstRowFingerprint = currentFirstRow;

    allRows.push(...result.rows);
    if (!result.hasNext) break;
    page++;
  }

  avisarSeAtingiuMaxPages(page, maxPages, pageSize);
  return allRows;
}

export function mergeAndDedupe(rows: ProtheusRow[], keyFields: string[]): ProtheusRow[] {
  const map = new Map<string, ProtheusRow>();
  for (const row of rows) {
    const key = keyFields
      .map((f) => row[f] ?? row[f.toUpperCase()] ?? row[f.toLowerCase()] ?? "")
      .join("|");
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return Array.from(map.values());
}
