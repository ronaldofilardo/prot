import { ProtheusClientError, type ProtheusRow } from "../protheus-client";
import { buildAuthHeader } from "./rest-auth";
import { executeFetch } from "./rest-retry";
import { readPage } from "./rest-parse-response";
import type { ProtheusRestConfig } from "./rest-types";

export async function fetchPage(
  path: string | undefined,
  config: ProtheusRestConfig,
  settingName: string,
  page: number,
  pageSize: number
): Promise<{ rows: ProtheusRow[]; hasNext: boolean }> {
  if (!path) {
    throw new ProtheusClientError(`${settingName} nao configurado`);
  }
  const url = new URL(path, config.baseUrl);
  if (!url.pathname.includes("genericQuery")) {
    url.searchParams.set("empresa", config.empresaId);
    url.searchParams.set("filial", config.filial);
  }
  url.searchParams.set("page", String(page));
  url.searchParams.set("pagesize", String(pageSize));

  let auth = await buildAuthHeader(config);
  let response = await executeFetch(url.toString(), auth, path);
  if (response.status === 401 && (config.authMode === "oauth2" || config.authMode === "bearer")) {
    try {
      auth = await buildAuthHeader(config, true);
      response = await executeFetch(url.toString(), auth, path);
    } catch {
      // Se a renovacao falhar, mantem a resposta original
    }
  }
  return readPage(response, path);
}

export async function fetchAllPages(
  fetcher: (page: number, pageSize: number) => Promise<{ rows: ProtheusRow[]; hasNext: boolean }>,
  options: { pageSize: number }
): Promise<ProtheusRow[]> {
  const allRows: ProtheusRow[] = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const result = await fetcher(page, options.pageSize);
    allRows.push(...result.rows);
    hasNext = result.hasNext;
    page++;
  }
  return allRows;
}