export type {
  EntidadeCanonica,
  CanonicalParty,
  CanonicalInvoice,
  CanonicalTitle,
  CanonicalPayment,
  IngestPayload,
} from "./canonical";

export {
  csvRowToCanonicalCliente,
  csvRowToCanonicalFaturamento,
  csvRowToCanonicalContaReceber,
  csvRowToCanonicalBaixa,
} from "./protheus-adapter";

export {
  syncClientes,
  syncFaturamentos,
  syncContasReceber,
  syncBaixas,
  type SyncResult,
} from "./sync-engine";

export type { ProtheusClient, ProtheusRow } from "./protheus-client";
export { ProtheusClientError } from "./protheus-client";
export { ProtheusRestClient, type ProtheusRestConfig } from "./protheus-rest-client";
export { protheusTokenProvider, type IProtheusTokenProvider } from "./protheus-token-provider";
export { getProtheusClient } from "./protheus-client-factory";
export { pullAndSyncFromProtheus, type PullEntityResult } from "./pull-and-sync";
