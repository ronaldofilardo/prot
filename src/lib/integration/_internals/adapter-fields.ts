export function trimField(row: Record<string, unknown>, key: string): string {
  const val = row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
  return val !== undefined && val !== null ? String(val).trim() : (undefined as unknown as string);
}

export function trimOr(row: Record<string, unknown>, key: string, fallback: string): string {
  const val = trimField(row, key);
  return val || fallback;
}

export function parseProtheusDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const clean = String(dateStr).replace(/-/g, "").trim();
  if (clean.length !== 8) return new Date().toISOString();
  const y = clean.substring(0, 4);
  const m = clean.substring(4, 6);
  const d = clean.substring(6, 8);
  return `${y}-${m}-${d}T00:00:00.000Z`;
}
