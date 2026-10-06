import type { ProtheusRow } from "../protheus-client";
import type { PageResult } from "./rest-parse";

export type GetPageFn = (page: number, pageSize: number) => Promise<PageResult>;

export async function fetchAllPages(
  getPage: GetPageFn,
  options: { pageSize?: number } = {}
): Promise<ProtheusRow[]> {
  const pageSize = options.pageSize ?? 100;
  let allRows: ProtheusRow[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const result = await getPage(page, pageSize);
    allRows = allRows.concat(result.rows);
    if (!result.hasNext || result.rows.length === 0) {
      hasNext = false;
    } else {
      page++;
    }
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
