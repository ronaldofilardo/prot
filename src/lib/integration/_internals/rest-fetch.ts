import { ProtheusClientError, type ProtheusRow } from "../protheus-client";
import { buildAuthHeader } from "./rest-auth";
import { executeFetch } from "./rest-retry";
import { readPage } from "./rest-parse-response";
import type { ProtheusRestConfig } from "./rest-types";

import { applyWhereToPath } from "./sync-filter-date";
export { fetchAllPages } from "./rest-paginate";

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
  const targetPath = applyWhereToPath(path);
  const url = new URL(targetPath, config.baseUrl);
  if (!url.pathname.includes("genericQuery")) {
    url.searchParams.set("empresa", config.empresaId);
    url.searchParams.set("filial", config.filial);
  }
  url.searchParams.set("page", String(page));
  if (url.searchParams.has("pagesize") && !url.searchParams.has("pageSize")) {
    const existingVal = url.searchParams.get("pagesize");
    url.searchParams.delete("pagesize");
    url.searchParams.set("pageSize", existingVal || String(pageSize));
  } else if (!url.searchParams.has("pageSize")) {
    url.searchParams.set("pageSize", String(pageSize));
  }

  let auth = await buildAuthHeader(config);
  let response = await executeFetch(url.toString(), auth, targetPath);
  if (response.status === 401 && (config.authMode === "oauth2" || config.authMode === "bearer")) {
    try {
      auth = await buildAuthHeader(config, true);
      response = await executeFetch(url.toString(), auth, targetPath);
    } catch {
      // Se a renovacao falhar, mantem a resposta original
    }
  }
  return readPage(response, targetPath);
}