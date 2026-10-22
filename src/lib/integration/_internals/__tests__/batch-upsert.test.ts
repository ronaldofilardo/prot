import { describe, it, expect, vi } from "vitest";
import {
  chunkArray,
  diffNumbers,
  diffDates,
  executeBatchCreate,
  executeBatchUpdate,
  buildClienteMap,
  buildContaReceberMap,
  buildContaPagarMap,
} from "../batch-upsert";
import { clienteKey } from "../cliente-key";
import type { PrismaClient } from "@prisma/client";

describe("batch-upsert", () => {
  it("divide array em chunks de tamanho configurável", () => {
    const items = Array.from({ length: 1250 }, (_, i) => i);
    const chunks = chunkArray(items, 500);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(500);
    expect(chunks[2]).toHaveLength(250);
  });

  it("detecta diferenças numéricas e de datas corretamente", () => {
    expect(diffNumbers(100, 100)).toBe(false);
    expect(diffNumbers(100.0, "100.00")).toBe(false);
    expect(diffNumbers(100, 100.5)).toBe(true);
    expect(diffDates("2026-01-01T00:00:00Z", new Date("2026-01-01T00:00:00Z"))).toBe(false);
    expect(diffDates("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z")).toBe(true);
  });

  it("executa createMany em chunks com skipDuplicates", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 500 });
    const items = Array.from({ length: 750 }, (_, i) => ({ id: i }));
    const total = await executeBatchCreate({ createMany }, items, 500);

    expect(createMany).toHaveBeenCalledTimes(2);
    expect(createMany).toHaveBeenCalledWith({ data: items.slice(0, 500), skipDuplicates: true });
    expect(createMany).toHaveBeenCalledWith({ data: items.slice(500), skipDuplicates: true });
    expect(total).toBe(1000);
  });

  it("executa $transaction em chunks de operações de update", async () => {
    const $transaction = vi.fn().mockResolvedValue([]);
    const ops = Array.from({ length: 250 }, (_, i) => ({ op: i }));
    const total = await executeBatchUpdate({ $transaction }, ops, 100);

    expect($transaction).toHaveBeenCalledTimes(3);
    expect(total).toBe(250);
  });

  it("constrói mapas de resolução antecipada de chaves", async () => {
    const mockTx = {
      cliente: { findMany: vi.fn().mockResolvedValue([{ id: "c1", codigo: "001", loja: "01" }]) },
      contaReceber: { findMany: vi.fn().mockResolvedValue([{ id: "r1", filial: "01", prefixo: "F", numero: "10", parcela: "1" }]) },
      contaPagar: { findMany: vi.fn().mockResolvedValue([{ id: "p1", filial: "01", prefixo: "F", numero: "20", parcela: "1", tipo: "NF", fornecedorCodigo: "FORN", fornecedorLoja: "01" }]) },
    } as unknown as PrismaClient;

    const [cMap, rMap, pMap] = await Promise.all([
      buildClienteMap(mockTx, "emp-01"),
      buildContaReceberMap(mockTx, "emp-01"),
      buildContaPagarMap(mockTx, "emp-01"),
    ]);

    expect(cMap.get(clienteKey("001", "01"))).toBe("c1");
    expect(cMap.get(clienteKey("001", "0001"))).toBe("c1");
    expect(rMap.get("01|F|10|1")).toBe("r1");
    expect(pMap.get("01|F|20|1|NF|FORN|01")).toBe("p1");
  });
});
