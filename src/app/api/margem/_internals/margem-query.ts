import { prisma } from "@/lib/db/prisma-client";
import type { Prisma } from "@prisma/client";
import type { MargemFiltrosDTO } from "../types";

export interface ItemVendaRowAgregacao {
  id: string;
  dataEmissao: Date;
  valorTotal: Prisma.Decimal;
  custo: Prisma.Decimal;
  clienteId: string;
  cliente: {
    codigo: string;
    loja: string;
    nome: string;
  };
}

export function buildWhereMargem(empresaIds: string[], filters: MargemFiltrosDTO): Prisma.ItemVendaWhereInput {
  const cfopsEnv = process.env.PROTHEUS_CFOPS_VENDA;
  const cfopsValidos = cfopsEnv ? cfopsEnv.split(",").map((c) => c.trim()).filter(Boolean) : undefined;

  const where: Prisma.ItemVendaWhereInput = {
    empresaId: { in: empresaIds },
    tipo: "N",
  };

  if (cfopsValidos && cfopsValidos.length > 0) {
    where.cfop = { in: cfopsValidos };
  }

  if (filters.filial) {
    where.filial = filters.filial;
  }

  if (filters.clienteId) {
    where.clienteId = filters.clienteId;
  }

  if (filters.dataInicio || filters.dataFim) {
    where.dataEmissao = {};
    if (filters.dataInicio) {
      where.dataEmissao.gte = new Date(filters.dataInicio);
    }
    if (filters.dataFim) {
      where.dataEmissao.lte = new Date(filters.dataFim);
    }
  }

  return where;
}

export async function carregarItensMargem(
  empresaIds: string[],
  filters: MargemFiltrosDTO
): Promise<ItemVendaRowAgregacao[]> {
  const where = buildWhereMargem(empresaIds, filters);

  return prisma.itemVenda.findMany({
    where,
    select: {
      id: true,
      dataEmissao: true,
      valorTotal: true,
      custo: true,
      clienteId: true,
      cliente: {
        select: {
          codigo: true,
          loja: true,
          nome: true,
        },
      },
    },
    orderBy: { dataEmissao: "asc" },
  });
}
