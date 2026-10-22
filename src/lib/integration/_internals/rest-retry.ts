import { ProtheusClientError, type ProtheusRow } from "../protheus-client";

/**
 * Timeout de rede para requisições Protheus REST (ms).
 * Alinhado com RTT típico de APIs síncronas (§10 REFACTORING_POLICY).
 */
const PROTHEUS_FETCH_TIMEOUT_MS = 8000;

/**
 * Jitter máximo (ms) para backoff exponencial em retry.
 * Evita thundering herd em falhas coincidentes de múltiplos clientes (§10).
 */
const PROTHEUS_RETRY_JITTER_MAX_MS = 300;

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Calcula backoff exponencial com jitter: delay = min(cap, 2^attempt + random(0, jitterMax)).
 * @param attempt Número da tentativa (0-indexed)
 * @param capMs Máximo absoluto de espera (ms)
 * @returns Delay em ms para aguardar antes da próxima tentativa
 */
function exponentialBackoffWithJitter(attempt: number, capMs: number): number {
  const exponentialDelay = Math.pow(2, attempt) * 1000; // começa em 1s, 2s, 4s...
  const jitter = Math.random() * PROTHEUS_RETRY_JITTER_MAX_MS;
  return Math.min(capMs, exponentialDelay + jitter);
}

import { logRestPathResponse } from "../logger";

export function getFetchTimeoutMs(): number {
  const envVal = Number(process.env.PROTHEUS_FETCH_TIMEOUT_MS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : 25000;
}

async function aguardarRetry(attempt: number): Promise<void> {
  const delay = process.env.NODE_ENV === "test" ? 0 : exponentialBackoffWithJitter(attempt, 3000);
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
}

async function tentarFetch(fullUrl: string, authHeader: string, timeoutMs: number): Promise<Response> {
  const response = await fetch(fullUrl, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response) {
    throw new Error("Resposta de rede indefinida");
  }
  return response;
}

export async function executeFetch(
  fullUrl: string,
  authHeader: string,
  path: string,
): Promise<Response> {
  const timeoutMs = getFetchTimeoutMs();
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await tentarFetch(fullUrl, authHeader, timeoutMs);
      if (response.status >= 500 && attempt < 2) {
        await aguardarRetry(attempt);
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        await aguardarRetry(attempt);
        continue;
      }
    }
  }

  throw new ProtheusClientError(
    `Falha de rede ao consultar Protheus REST (${path})`,
    lastError,
  );
}

function isSkippablePathError(err: Error): boolean {
  return err.message.includes("404") || err.message.includes("400");
}

/**
 * Tenta buscar linhas de múltiplas paths, retornando o primeiro resultado não-vazio
 * ou fallback. Ignora 404s e 400s (path/params inválidos neste Protheus — tenta
 * próxima), propaga erros críticos após jitter+retry.
 */
export async function fetchRowsFromFirstPath(
  paths: string[],
  get: (path: string) => Promise<ProtheusRow[]>,
  onAllNotFound: () => ProtheusRow[],
): Promise<ProtheusRow[]> {
  let lastError: Error | null = null;
  for (const path of paths) {
    try {
      const rows = await get(path);
      if (rows) {
        logRestPathResponse(path, rows.length);
        return rows;
      }
    } catch (err) {
      lastError = toError(err);
      if (isSkippablePathError(lastError)) continue;
      throw lastError;
    }
  }
  if (lastError) {
    if (isSkippablePathError(lastError)) return onAllNotFound();
    throw lastError;
  }
  return [];
}

/**
 * Exporta `exponentialBackoffWithJitter` para testes e uso opcional em retry crítico.
 * Caller pode aplicar delay antes de nova tentativa em casos de degradação.
 */
export { exponentialBackoffWithJitter };
export type { exponentialBackoffWithJitter as ExponentialBackoffWithJitter };

export async function fetchFirstNonEmptyOrThrow(
  paths: string[],
  get: (path: string) => Promise<ProtheusRow[]>,
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
  get: (path: string) => Promise<ProtheusRow[]>,
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
