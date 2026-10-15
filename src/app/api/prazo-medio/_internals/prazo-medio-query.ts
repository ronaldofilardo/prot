import { prisma } from "@/lib/db/prisma-client";
import type { Prisma } from "@prisma/client";
import type { PrazoMedioFiltrosDTO } from "../types";

const TIPOS_EXCLUIDOS_DEFAULT = new Set(["RA", "NCC", "PR", "NDF", "PA"]);

export function isTipoElegivelReceber(tipo: string): boolean {
  const t = (tipo || "").trim().toUpperCase();
  if (!t) return false;
  if (t.endsWith("-")) return false;
  const inclusionEnv = process.env.PROTHEUS_TIPOS_TITULO_RECEBER;
  if (inclusionEnv) {
    const permitidos = new Set(inclusionEnv.split(",").map((s) => s.trim().toUpperCase()));
    return permitidos.has(t);
  }
  return !TIPOS_EXCLUIDOS_DEFAULT.has(t);
}

export interface TituloReceberAgregacao {
  id: string;
  filial: string;
  tipo: string;
  dataEmissao: Date;
  vencimento: Date;
  valor: Prisma.Decimal;
  saldo: Prisma.Decimal;
  clienteId: string;
  cliente: { codigo: string; loja: string; nome: string };
}

export interface BaixaReceberAgregacao {
  id: string;
  filial: string;
  tipo: string;
  valorBaixa: Prisma.Decimal;
  dataBaixa: Date;
  contaReceber: {
    dataEmissao: Date;
    vencimento: Date;
    clienteId: string;
    cliente: { codigo: string; loja: string; nome: string };
  };
}

export async function carregarTitulosReceber(
  empresaIds: string[],
  filters: PrazoMedioFiltrosDTO
): Promise<TituloReceberAgregacao[]> {
  const where: Prisma.ContaReceberWhereInput = { empresaId: { in: empresaIds } };
  if (filters.filial) where.filial = filters.filial;
  if (filters.clienteId) where.clienteId = filters.clienteId;
  if (filters.dataInicio || filters.dataFim) {
    where.dataEmissao = {};
    if (filters.dataInicio) where.dataEmissao.gte = new Date(filters.dataInicio);
    if (filters.dataFim) where.dataEmissao.lte = new Date(filters.dataFim);
  }
  return prisma.contaReceber.findMany({
    where,
    select: {
      id: true, filial: true, tipo: true, dataEmissao: true, vencimento: true, valor: true, saldo: true,
      clienteId: true, cliente: { select: { codigo: true, loja: true, nome: true } },
    },
  });
}

export async function carregarBaixasReceber(
  empresaIds: string[],
  filters: PrazoMedioFiltrosDTO
): Promise<BaixaReceberAgregacao[]> {
  const where: Prisma.BaixaWhereInput = { empresaId: { in: empresaIds } };
  if (filters.filial) where.filial = filters.filial;
  if (filters.clienteId) where.contaReceber = { clienteId: filters.clienteId };
  if (filters.dataInicio || filters.dataFim) {
    where.dataBaixa = {};
    if (filters.dataInicio) where.dataBaixa.gte = new Date(filters.dataInicio);
    if (filters.dataFim) where.dataBaixa.lte = new Date(filters.dataFim);
  }
  return prisma.baixa.findMany({
    where,
    select: {
      id: true, filial: true, tipo: true, valorBaixa: true, dataBaixa: true,
      contaReceber: {
        select: {
          dataEmissao: true, vencimento: true, clienteId: true,
          cliente: { select: { codigo: true, loja: true, nome: true } },
        },
      },
    },
  });
}
