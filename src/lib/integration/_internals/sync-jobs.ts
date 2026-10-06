import type { PrismaClient } from "@prisma/client";
import type { ProtheusClient, ProtheusRow } from "../protheus-client";
import type { SyncResult } from "../sync-engine";

export interface PullEntityResult {
  entidade: string;
  registros: number;
  sync: SyncResult;
  erro?: string;
}

export type SyncFn<T = unknown> = (
  tx: PrismaClient,
  empresaId: string,
  registros: T[],
) => Promise<SyncResult>;

export interface EntityJob<T = unknown> {
  entidade: "Cliente" | "Faturamento" | "ContaReceber" | "Baixa" | "SaldoContabil";
  fetch: (client: ProtheusClient) => Promise<ProtheusRow[]>;
  toCanonical: (row: ProtheusRow, empresaId: string) => T;
  sync: SyncFn<T>;
}

export const ENTITY_ORDER = ["Cliente", "Faturamento", "ContaReceber", "Baixa", "SaldoContabil"] as const;