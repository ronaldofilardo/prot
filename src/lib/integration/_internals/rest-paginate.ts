import type { ProtheusRow } from "../protheus-client";
import type { PageResult } from "./rest-parse";

export type GetPageFn = (page: number, pageSize: number) => Promise<PageResult>;

import { logRestPageWarning } from "../logger";

const DEFAULT_DEADLINE_MS = 45_000;

export async function fetchAllPages(
  getPage: GetPageFn,
  options: { pageSize?: number; maxPages?: number; deadlineMs?: number } = {}
): Promise<ProtheusRow[]> {
  const envPageSize = Number(process.env.PROTHEUS_PAGE_SIZE);
  const pageSize = options.pageSize ?? (Number.isFinite(envPageSize) && envPageSize > 0 ? envPageSize : 100);
  const maxPages = options.maxPages ?? 200;
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const startedAt = Date.now();
  let allRows: ProtheusRow[] = [];
  let page = 1;
  let hasNext = true;
  let previousFirstRowFingerprint: string | null = null;

  while (hasNext && page <= maxPages) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= deadlineMs) {
      logRestPageWarning("Deadline de paginacao atingido; retornando parcial", {
        page,
        pagesLidas: page - 1,
        linhas: allRows.length,
        elapsedMs: elapsed,
        deadlineMs,
      });
      break;
    }

    const result = await getPage(page, pageSize);
    if (!result || !result.rows || result.rows.length === 0) {
      break;
    }

    const currentFirstRow = JSON.stringify(result.rows[0]);
    if (page > 1 && currentFirstRow === previousFirstRowFingerprint) {
      logRestPageWarning("Servidor Protheus ignorou o parametro de pagina; encerrando paginacao.", { page, pageSize });
      break;
    }
    previousFirstRowFingerprint = currentFirstRow;

    allRows = allRows.concat(result.rows);
    if (!result.hasNext) {
      break;
    }
    page++;
  }

  if (page > maxPages) {
    logRestPageWarning("Limite maximo de paginas atingido na paginacao REST", { maxPages, pageSize });
  }

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
