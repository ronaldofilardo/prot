import type { PrismaClient } from "@prisma/client";
import type { CanonicalParty } from "../canonical";
import { logSyncError, logSyncStart } from "../logger";
import { parseClienteExternalId } from "./sync-parsers";
import type { SyncResult } from "./sync-types";
import { executeBatchCreate, executeBatchUpdate } from "./batch-upsert";
import { clienteKey } from "./cliente-key";

interface ClienteItem {
  codigo: string;
  loja: string;
  nome: string;
  cidade: string;
  estado: string;
  ativo: boolean;
  empresaId: string;
}

type ClienteExistente = { id: string; nome: string; cidade: string; estado: string; ativo: boolean };
type ClienteMap = Map<string, ClienteExistente>;

interface ClassificacaoClientes {
  paraCriar: ClienteItem[];
  paraAtualizar: Array<{ id: string; data: { nome: string; cidade: string; estado: string; ativo: boolean } }>;
}

function clienteDiferente(existing: ClienteExistente, reg: CanonicalParty): boolean {
  return existing.nome !== reg.name || existing.cidade !== reg.city || existing.estado !== reg.state || existing.ativo !== reg.active;
}

function classificarClientes(registros: CanonicalParty[], map: ClienteMap, empresaId: string): ClassificacaoClientes {
  const paraCriar: ClienteItem[] = [];
  const paraAtualizar: Array<{ id: string; data: { nome: string; cidade: string; estado: string; ativo: boolean } }> = [];

  for (const reg of registros) {
    const { codigo, loja } = parseClienteExternalId(reg.externalId);
    const existing = map.get(clienteKey(codigo, loja));
    if (existing) {
      const data = { nome: reg.name, cidade: reg.city, estado: reg.state, ativo: reg.active };
      if (clienteDiferente(existing, reg)) paraAtualizar.push({ id: existing.id, data });
    } else {
      paraCriar.push({ codigo, loja, nome: reg.name, cidade: reg.city, estado: reg.state, ativo: reg.active, empresaId });
    }
  }

  return { paraCriar, paraAtualizar };
}

async function syncClientesFallback(tx: PrismaClient, empresaId: string, registros: CanonicalParty[]): Promise<SyncResult> {
  let criados = 0, atualizados = 0, erros = 0;
  for (const reg of registros) {
    try {
      const { codigo, loja } = parseClienteExternalId(reg.externalId);
      const existing = await tx.cliente.findUnique({ where: { codigo_loja_empresaId: { codigo, loja, empresaId } } });
      if (existing) {
        await tx.cliente.update({ where: { id: existing.id }, data: { nome: reg.name, cidade: reg.city, estado: reg.state, ativo: reg.active } });
        atualizados++;
      } else {
        await tx.cliente.create({ data: { codigo, loja, nome: reg.name, cidade: reg.city, estado: reg.state, ativo: reg.active, empresaId } });
        criados++;
      }
    } catch (err) {
      erros++;
      logSyncError("Cliente", reg.externalId, err);
    }
  }
  return { entidade: "Cliente", processados: registros.length, criados, atualizados, erros };
}

export async function syncClientes(tx: PrismaClient, empresaId: string, registros: CanonicalParty[]): Promise<SyncResult> {
  logSyncStart("Cliente", empresaId, registros.length);
  if (registros.length === 0) return { entidade: "Cliente", processados: 0, criados: 0, atualizados: 0, erros: 0 };
  if (typeof tx.cliente?.findMany !== "function") return syncClientesFallback(tx, empresaId, registros);

  try {
    const existentes = await tx.cliente.findMany({
      where: { empresaId },
      select: { id: true, codigo: true, loja: true, nome: true, cidade: true, estado: true, ativo: true },
    });
    const map: ClienteMap = new Map(existentes.map((c) => [clienteKey(c.codigo, c.loja), c]));
    const { paraCriar, paraAtualizar } = classificarClientes(registros, map, empresaId);

    const criados = await executeBatchCreate(tx.cliente, paraCriar);
    const atualizados = await executeBatchUpdate(tx, paraAtualizar.map((u) => tx.cliente.update({ where: { id: u.id }, data: u.data })));
    return { entidade: "Cliente", processados: registros.length, criados, atualizados, erros: 0 };
  } catch (err) {
    logSyncError("Cliente", `batch-${empresaId}`, err);
    return syncClientesFallback(tx, empresaId, registros);
  }
}
