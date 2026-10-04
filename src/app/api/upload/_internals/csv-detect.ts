import {
  csvRowToCanonicalCliente,
  csvRowToCanonicalFaturamento,
  csvRowToCanonicalContaReceber,
  csvRowToCanonicalBaixa,
} from "@/lib/integration/protheus-adapter";
import {
  syncClientes,
  syncFaturamentos,
  syncContasReceber,
  syncBaixas,
  type SyncResult,
} from "@/lib/integration/sync-engine";
import type { PrismaClient } from "@prisma/client";

type SyncFn = (tx: PrismaClient, empresaId: string, registros: unknown[]) => Promise<SyncResult>;

export type EntityDetector = {
  entidade: string;
  detect: (headers: string[]) => boolean;
  toCanonical: (row: Record<string, string>, empresaId: string) => unknown;
  sync: SyncFn;
};

const ENTITY_DETECTORS: EntityDetector[] = [
  {
    entidade: "Cliente",
    detect: (h) => h.includes("A1_COD") && h.includes("A1_NOME"),
    toCanonical: (r, e) => csvRowToCanonicalCliente(r, e),
    sync: syncClientes as SyncFn,
  },
  {
    entidade: "Faturamento",
    detect: (h) => h.includes("F2_DOC") && h.includes("F2_VALOR"),
    toCanonical: (r, e) => csvRowToCanonicalFaturamento(r, e),
    sync: syncFaturamentos as SyncFn,
  },
  {
    entidade: "ContaReceber",
    detect: (h) => h.includes("E1_PREFIXO") && h.includes("E1_NUM"),
    toCanonical: (r, e) => csvRowToCanonicalContaReceber(r, e),
    sync: syncContasReceber as SyncFn,
  },
  {
    entidade: "Baixa",
    detect: (h) => h.includes("E5_PREFIXO") && h.includes("E5_VALOR"),
    toCanonical: (r, e) => csvRowToCanonicalBaixa(r, e),
    sync: syncBaixas as SyncFn,
  },
];

export function findDetector(headers: string[]): EntityDetector | undefined {
  return ENTITY_DETECTORS.find((d) => d.detect(headers));
}
