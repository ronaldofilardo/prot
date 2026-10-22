/**
 * Utilitário puro para filtros de data no sync Protheus (§3.1 PLANO_CORRECAO_SYNC_PROTHEUS).
 */

export function getSyncDataCorte(meses?: number): string {
  const m = meses ?? (Number(process.env.PROTHEUS_SYNC_MESES) || 12);
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}${mes}${dia}`;
}

export function buildWhereClause(table: string, dataCorte: string): string {
  switch (table.toUpperCase()) {
    case "SF2":
      return `F2_EMISSAO >= '${dataCorte}'`;
    case "SD2":
      return `D2_EMISSAO >= '${dataCorte}'`;
    case "SE1":
      return `E1_SALDO > 0 OR E1_EMISSAO >= '${dataCorte}'`;
    case "SE2":
      return `E2_SALDO > 0 OR E2_EMISSAO >= '${dataCorte}'`;
    case "SE5":
      return `E5_DATA >= '${dataCorte}'`;
    default:
      return "";
  }
}

export function applyWhereToPath(path: string, dataCorte: string = getSyncDataCorte()): string {
  if (!path.includes("genericQuery")) return path;
  const match = path.match(/tables=([A-Za-z0-9_]+)/i);
  if (!match) return path;
  const table = match[1].toUpperCase();
  const where = buildWhereClause(table, dataCorte);
  if (!where || path.toLowerCase().includes("where=")) return path;

  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}where=${encodeURIComponent(where)}`;
}
