export function trimField(row: Record<string, string>, key: string): string {
  return row[key]?.trim();
}

export function trimOr(row: Record<string, string>, key: string, fallback: string): string {
  return row[key]?.trim() || fallback;
}

export function parseProtheusDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return new Date().toISOString();
  const y = dateStr.substring(0, 4);
  const m = dateStr.substring(4, 6);
  const d = dateStr.substring(6, 8);
  return `${y}-${m}-${d}T00:00:00.000Z`;
}
