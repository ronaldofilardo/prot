/**
 * Sync Engine — upsert idempotente com delta sync.
 *
 * Referência: guia de integração §5:
 * - Chave idempotente: empresa + filial + tipo + número + parcela
 * - Delta: usa `sincronizadoEm` para extrair só o novo
 * - Idempotência: upsert evita duplicação
 */

export type { SyncResult } from "./_internals/sync-types";
export {
  parseClienteExternalId,
  parseFaturamentoExternalId,
  parseContaReceberExternalId,
  parseBaixaExternalId,
} from "./_internals/sync-parsers";
export { syncClientes } from "./_internals/sync-clientes";
export { syncFaturamentos } from "./_internals/sync-faturamento";
export { syncContasReceber } from "./_internals/sync-contas-receber";
export { syncBaixas } from "./_internals/sync-baixas";
