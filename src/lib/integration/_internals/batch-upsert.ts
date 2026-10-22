import type { PrismaClient } from "@prisma/client";

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function diffNumbers(a: unknown, b: unknown): boolean {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isNaN(numA) || Number.isNaN(numB)) return a !== b;
  return Math.abs(numA - numB) > 0.0001;
}

export function diffDates(a: Date | string | null | undefined, b: Date | string | null | undefined): boolean {
  if (!a || !b) return a !== b;
  const timeA = new Date(a).getTime();
  const timeB = new Date(b).getTime();
  return timeA !== timeB;
}

export async function executeBatchCreate<T>(
  model: {
    createMany?: (args: { data: T[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
    create?: (args: { data: T }) => Promise<unknown>;
  },
  items: T[],
  chunkSize = 500
): Promise<number> {
  if (items.length === 0) return 0;

  if (typeof model.createMany === "function") {
    const chunks = chunkArray(items, chunkSize);
    let total = 0;
    for (const chunk of chunks) {
      const res = await model.createMany({ data: chunk, skipDuplicates: true });
      total += res?.count ?? chunk.length;
    }
    return total;
  }

  if (typeof model.create === "function") {
    for (const item of items) {
      await model.create({ data: item });
    }
    return items.length;
  }

  return 0;
}

export async function executeBatchUpdate(
  prismaOrTx: { $transaction?: (ops: unknown[]) => Promise<unknown> },
  updateOps: unknown[],
  chunkSize = 100
): Promise<number> {
  if (updateOps.length === 0) return 0;

  if (typeof prismaOrTx.$transaction === "function") {
    const chunks = chunkArray(updateOps, chunkSize);
    for (const chunk of chunks) {
      await prismaOrTx.$transaction(chunk);
    }
    return updateOps.length;
  }

  for (const op of updateOps) {
    if (op && typeof (op as Promise<unknown>).then === "function") {
      await (op as Promise<unknown>);
    }
  }
  return updateOps.length;
}

export async function buildClienteMap(tx: PrismaClient, empresaId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    if (typeof tx.cliente?.findMany === "function") {
      const rows = await tx.cliente.findMany({
        where: { empresaId },
        select: { id: true, codigo: true, loja: true },
      });
      for (const c of rows) {
        map.set(`${c.codigo}|${c.loja}`, c.id);
      }
    }
  } catch {
    // Retorna mapa vazio se houver erro ou em mock restrito
  }
  return map;
}

export async function buildContaReceberMap(tx: PrismaClient, empresaId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    if (typeof tx.contaReceber?.findMany === "function") {
      const rows = await tx.contaReceber.findMany({
        where: { empresaId },
        select: { id: true, filial: true, prefixo: true, numero: true, parcela: true, tipo: true },
      });
      for (const r of rows) {
        map.set(`${r.filial}|${r.prefixo}|${r.numero}|${r.parcela}|${r.tipo}`, r.id);
        if (!map.has(`${r.filial}|${r.prefixo}|${r.numero}|${r.parcela}`)) {
          map.set(`${r.filial}|${r.prefixo}|${r.numero}|${r.parcela}`, r.id);
        }
      }
    }
  } catch {
    // Retorna mapa vazio se houver erro
  }
  return map;
}

export async function buildContaPagarMap(tx: PrismaClient, empresaId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    if (typeof tx.contaPagar?.findMany === "function") {
      const rows = await tx.contaPagar.findMany({
        where: { empresaId },
        select: { id: true, filial: true, prefixo: true, numero: true, parcela: true, tipo: true, fornecedorCodigo: true, fornecedorLoja: true },
      });
      for (const p of rows) {
        map.set(`${p.filial}|${p.prefixo}|${p.numero}|${p.parcela}|${p.tipo}|${p.fornecedorCodigo}|${p.fornecedorLoja}`, p.id);
      }
    }
  } catch {
    // Retorna mapa vazio se houver erro
  }
  return map;
}
