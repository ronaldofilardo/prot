import type { ProtheusRow } from "../protheus-client";

/**
 * Filtra linhas da SE5 para manter apenas baixas a receber.
 * Regra:
 * - Descarta linhas onde E5_RECPAG === "P" (contas a pagar).
 * - Mantém linhas onde E5_RECPAG === "R" ou ausente/vazio (retrocompatibilidade com CSV/mocks).
 */
export function filterBaixasReceber(rows: ProtheusRow[]): ProtheusRow[] {
  return rows.filter((row) => {
    const recpag = (row.E5_RECPAG ?? "").trim().toUpperCase();
    return recpag !== "P";
  });
}
