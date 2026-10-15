import type { ProtheusRow } from "../protheus-client";
import type { ProtheusRestConfig } from "./rest-types";
import { buildCandidatePaths, CONTAS_PAGAR_FALLBACK_PATHS } from "./rest-paths";
import { fetchRowsFromFirstPath } from "./rest-retry";
import { mergeAndDedupe } from "./rest-paginate";
import { buildFallbackContasPagarRows } from "./rest-mock";

export async function fetchContasPagar(
  config: ProtheusRestConfig,
  customPath: string | undefined,
  getRows: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusRow[]> {
  const candidatePaths = buildCandidatePaths(customPath, [
    config.paths.contasPagar,
    process.env.PROTHEUS_REST_CONTAS_PAGAR_PATH,
    ...CONTAS_PAGAR_FALLBACK_PATHS,
  ]);
  const rows = await fetchRowsFromFirstPath(candidatePaths, getRows, buildFallbackContasPagarRows);
  return mergeAndDedupe(rows, [
    "E2_FILIAL",
    "E2_PREFIXO",
    "E2_NUM",
    "E2_PARCELA",
    "E2_TIPO",
    "E2_FORNECE",
    "E2_LOJA",
  ]);
}
