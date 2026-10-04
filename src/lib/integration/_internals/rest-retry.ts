import { ProtheusClientError, type ProtheusRow } from "../protheus-client";

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export async function executeFetch(
  fullUrl: string,
  authHeader: string,
  path: string
): Promise<Response> {
  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response) {
      throw new Error("Resposta de rede indefinida");
    }
    return response;
  } catch (err) {
    throw new ProtheusClientError(`Falha de rede ao consultar Protheus REST (${path})`, err);
  }
}

export async function fetchRowsFromFirstPath(
  paths: string[],
  get: (path: string) => Promise<ProtheusRow[]>,
  onAllNotFound: () => ProtheusRow[]
): Promise<ProtheusRow[]> {
  let lastError: Error | null = null;
  for (const path of paths) {
    try {
      const rows = await get(path);
      if (rows) return rows;
    } catch (err) {
      lastError = toError(err);
      if (lastError.message.includes("404")) continue;
      throw lastError;
    }
  }
  if (lastError) {
    if (lastError.message.includes("404")) return onAllNotFound();
    throw lastError;
  }
  return [];
}

export async function fetchFirstNonEmptyOrThrow(
  paths: string[],
  get: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusRow[] | null> {
  let lastError: Error | null = null;
  for (const path of paths) {
    try {
      const rows = await get(path);
      if (!rows || rows.length === 0) continue;
      return rows;
    } catch (err) {
      lastError = toError(err);
      if (lastError.message.includes("404")) continue;
      throw lastError;
    }
  }
  if (lastError) throw lastError;
  return null;
}

export async function fetchFirstNonEmptySwallowingErrors(
  paths: string[],
  get: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusRow[] | null> {
  for (const path of paths) {
    try {
      const rows = await get(path);
      if (rows && rows.length > 0) return rows;
    } catch {
      continue;
    }
  }
  return null;
}
