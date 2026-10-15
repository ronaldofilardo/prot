import { prisma } from "@/lib/db/prisma-client";
import type { Prisma } from "@prisma/client";
import type { PrazoMedioFiltrosDTO } from "../types";

const TIPOS_EXCLUIDOS_PAGAR_DEFAULT = new Set(["ADI", "PA", "NCP", "NDI"]);

export function isTipoElegivelPagar(tipo: string): boolean {
  const t = (tipo || "").trim().toUpperCase();
  if (!t || t.endsWith("-")) return false;
  const env = process.env.PROTHEUS_TIPOS_TITULO_PAGAR;
  if (env) {
    return new Set(env.split(",").map((s) => s.trim().toUpperCase())).has(t);
  }
  return !TIPOS_EXCLUIDOS_PAGAR_DEFAULT.has(t);
}

export interface TituloPagarAgregacao {
  id: string;
  filial: string;
  tipo: string;
  dataEmissao: Date;
  vencimento: Date;
  valor: Prisma.Decimal;
  saldo: Prisma.Decimal;
  fornecedorCodigo: string;
  fornecedorLoja: string;
  fornecedorNome: string;
}

export async function carregarTitulosPagar(
  empresaIds: string[],
  filters: PrazoMedioFiltrosDTO
): Promise<TituloPagarAgregacao[]> {
  const where: Prisma.ContaPagarWhereInput = { empresaId: { in: empresaIds } };
  if (filters.filial) where.filial = filters.filial;
  if (filters.dataInicio || filters.dataFim) {
    where.dataEmissao = {};
    if (filters.dataInicio) where.dataEmissao.gte = new Date(filters.dataInicio);
    if (filters.dataFim) where.dataEmissao.lte = new Date(filters.dataFim);
  }
  return prisma.contaPagar.findMany({
    where,
    select: {
      id: true, filial: true, tipo: true, dataEmissao: true,
      vencimento: true, valor: true, saldo: true, fornecedorCodigo: true,
      fornecedorLoja: true, fornecedorNome: true,
    },
  });
}

export interface BaixaPagarAgregacao {
  id: string;
  filial: string;
  tipo: string;
  valorBaixa: Prisma.Decimal;
  dataBaixa: Date;
  contaPagar: {
    id: string;
    dataEmissao: Date;
    vencimento: Date;
    fornecedorCodigo: string;
    fornecedorLoja: string;
    fornecedorNome: string;
  };
}

export async function carregarBaixasPagar(
  empresaIds: string[],
  filters: PrazoMedioFiltrosDTO
): Promise<BaixaPagarAgregacao[]> {
  const where: Prisma.BaixaPagarWhereInput = { empresaId: { in: empresaIds } };
  if (filters.filial) where.filial = filters.filial;
  if (filters.dataInicio || filters.dataFim) {
    where.dataBaixa = {};
    if (filters.dataInicio) where.dataBaixa.gte = new Date(filters.dataInicio);
    if (filters.dataFim) where.dataBaixa.lte = new Date(filters.dataFim);
  }
  return prisma.baixaPagar.findMany({
    where,
    select: {
      id: true, filial: true, tipo: true, valorBaixa: true, dataBaixa: true,
      contaPagar: {
        select: {
          id: true, dataEmissao: true, vencimento: true,
          fornecedorCodigo: true, fornecedorLoja: true, fornecedorNome: true,
        },
      },
    },
  });
}
