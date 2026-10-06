import type { ProtheusClient } from "../protheus-client";
import {
  csvRowToCanonicalCliente,
  csvRowToCanonicalFaturamento,
  csvRowToCanonicalContaReceber,
  csvRowToCanonicalBaixa,
  csvRowToCanonicalSaldoContabil,
} from "../protheus-adapter";
import {
  syncClientes,
  syncFaturamentos,
  syncContasReceber,
  syncBaixas,
  syncSaldosContabeis,
} from "../sync-engine";
import type { SyncFn, EntityJob } from "./sync-jobs";

export const JOBS: EntityJob<unknown>[] = [
  {
    entidade: "Cliente",
    fetch: (c: ProtheusClient) => c.fetchClientes(),
    toCanonical: csvRowToCanonicalCliente,
    sync: syncClientes as SyncFn<unknown>,
  },
  {
    entidade: "Faturamento",
    fetch: (c: ProtheusClient) => c.fetchFaturamentos(),
    toCanonical: csvRowToCanonicalFaturamento,
    sync: syncFaturamentos as SyncFn<unknown>,
  },
  {
    entidade: "ContaReceber",
    fetch: (c: ProtheusClient) => c.fetchContasReceber(),
    toCanonical: csvRowToCanonicalContaReceber,
    sync: syncContasReceber as SyncFn<unknown>,
  },
  {
    entidade: "Baixa",
    fetch: (c: ProtheusClient) => c.fetchBaixas(),
    toCanonical: csvRowToCanonicalBaixa,
    sync: syncBaixas as SyncFn<unknown>,
  },
  {
    entidade: "SaldoContabil",
    fetch: (c: ProtheusClient) => c.fetchSaldosContabeis(),
    toCanonical: csvRowToCanonicalSaldoContabil,
    sync: syncSaldosContabeis as SyncFn<unknown>,
  },
];