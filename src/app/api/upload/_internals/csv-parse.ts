import { parse } from "csv-parse/sync";

export async function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  const content = await file.text();
  const cleaned = content.replace(/^\uFEFF/, "");
  return parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    delimiter: ";",
  }) as Record<string, string>[];
}

export function filtrarRegistrosAtivos(records: Record<string, string>[]): Record<string, string>[] {
  return records.filter((r) => r.D_E_L_E_T_ !== "*");
}
