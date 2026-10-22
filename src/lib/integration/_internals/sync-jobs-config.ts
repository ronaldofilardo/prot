import type { ProtheusClient, ProtheusRow } from "../protheus-client";
import {
  csvRowToCanonicalCliente,
  csvRowToCanonicalFaturamento,
  csvRowToCanonicalContaReceber,
  csvRowToCanonicalContaPagar,
  csvRowToCanonicalBaixa,
  csvRowToCanonicalBaixaPagar,
  csvRowToCanonicalSaldoContabil,
  filterBaixasPagar,
} from "../protheus-adapter";
import {
  syncClientes,
  syncFaturamentos,
  syncContasReceber,
  syncContasPagar,
  syncBaixas,
  syncBaixasPagar,
  syncSaldosContabeis,
  syncItensVenda,
} from "../sync-engine";
import { filterBaixasReceber } from "./adapter-baixas-filter";
import { csvRowToCanonicalItemVenda } from "./adapter-itens-venda";
import type { SyncFn, EntityJob } from "./sync-jobs";

const baixasCache = new WeakMap<ProtheusClient, Promise<ProtheusRow[]>>();

function fetchBaixasCompartilhada(c: ProtheusClient): Promise<ProtheusRow[]> {
  let cached = baixasCache.get(c);
  if (!cached) {
    cached = c.fetchBaixas();
    baixasCache.set(c, cached);
  }
  return cached;
}

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
    entidade: "ContaPagar",
    fetch: (c: ProtheusClient) => (c.fetchContasPagar ? c.fetchContasPagar() : Promise.resolve([])),
    toCanonical: csvRowToCanonicalContaPagar,
    sync: syncContasPagar as SyncFn<unknown>,
  },
  {
    entidade: "Baixa",
    fetch: async (c: ProtheusClient) => {
      const rows = await fetchBaixasCompartilhada(c);
      return filterBaixasReceber(rows);
    },
    toCanonical: csvRowToCanonicalBaixa,
    sync: syncBaixas as SyncFn<unknown>,
  },
  {
    entidade: "BaixaPagar",
    fetch: async (c: ProtheusClient) => {
      const rows = await fetchBaixasCompartilhada(c);
      return filterBaixasPagar(rows);
    },
    toCanonical: csvRowToCanonicalBaixaPagar,
    sync: syncBaixasPagar as SyncFn<unknown>,
  },
  {
    entidade: "SaldoContabil",
    fetch: (c: ProtheusClient) => c.fetchSaldosContabeis(),
    toCanonical: csvRowToCanonicalSaldoContabil,
    sync: syncSaldosContabeis as SyncFn<unknown>,
  },
  {
    entidade: "ItemVenda",
    fetch: (c: ProtheusClient) => (c.fetchItensVenda ? c.fetchItensVenda() : Promise.resolve([])),
    toCanonical: csvRowToCanonicalItemVenda,
    sync: syncItensVenda as SyncFn<unknown>,
  },
];