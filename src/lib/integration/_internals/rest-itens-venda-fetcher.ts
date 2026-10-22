import type { ProtheusRow } from "../protheus-client";
import type { ProtheusRestConfig } from "./rest-types";
import { buildCandidatePaths, ITENS_VENDA_FALLBACK_PATHS } from "./rest-paths";
import { fetchRowsFromFirstPath } from "./rest-retry";
import { mergeAndDedupe } from "./rest-paginate";

export async function fetchItensVenda(
  config: ProtheusRestConfig,
  customPath: string | undefined,
  getRows: (path: string) => Promise<ProtheusRow[]>
): Promise<ProtheusRow[]> {
  const candidatePaths = buildCandidatePaths(customPath, [
    config.paths.itensVenda,
    process.env.PROTHEUS_REST_ITENS_VENDA_PATH,
    ...ITENS_VENDA_FALLBACK_PATHS,
  ]);
  const rows = await fetchRowsFromFirstPath(candidatePaths, getRows, () => []);
  return mergeAndDedupe(rows, ["D2_FILIAL", "D2_DOC", "D2_SERIE", "D2_ITEM"]);
}
