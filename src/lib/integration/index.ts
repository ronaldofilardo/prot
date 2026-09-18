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
