import { ProtheusClientError, type ProtheusRow } from "../protheus-client";

export interface PageResult {
  rows: ProtheusRow[];
  hasNext: boolean;
}

export async function readRows(response: Response, path: string): Promise<ProtheusRow[]> {
  const page = await readPage(response, path);
  return page.rows;
}

export async function readPage(response: Response, path: string): Promise<PageResult> {
  assertOk(response, path);
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ProtheusClientError(`Resposta invalida (nao-JSON) de ${path}`);
  }

  const rows = extractRows(json);
  let hasNext = false;

  if (typeof json === "object" && json !== null) {
    const obj = json as Record<string, unknown>;
    if (typeof obj.hasNext === "boolean") {
      hasNext = obj.hasNext;
    } else if (typeof obj.remainingRecords === "number") {
      hasNext = obj.remainingRecords > 0;
    }
  }

  return { rows, hasNext };
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