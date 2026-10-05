import type { Faturamento, ContaReceber } from "@/lib/types/dashboard";

export interface KPIsCalculados {
  faturamentoTotal: number;
  valorVencido: number;
  ticketMedio: number;
}

function totalBaixado(cr: ContaReceber): number {
  return cr.baixas.reduce((acc: number, b) => acc + Number(b.valorBaixa), 0);
}

function contaVencida(cr: ContaReceber, hoje: Date): boolean {
  const dataVenc = new Date(cr.vencimento);
  return dataVenc < hoje && totalBaixado(cr) < Number(cr.valor);
}

export function calcularKPIs(
  faturamentosFiltrados: Faturamento[],
  contasReceberFiltrados: ContaReceber[]
): KPIsCalculados {
  const faturamentoTotal = faturamentosFiltrados.reduce(
    (acc, f) => acc + Number(f.valorTotal),
    0
  );

  const hoje = new Date();
  const contasVencidas = contasReceberFiltrados.filter((cr) => contaVencida(cr, hoje));

  const valorVencido = contasVencidas.reduce(
    (acc: number, cr: ContaReceber) => acc + (Number(cr.valor) - totalBaixado(cr)),
    0
  );

  const ticketMedio =
    faturamentosFiltrados.length > 0
      ? faturamentoTotal / faturamentosFiltrados.length
      : 0;

  return {
    faturamentoTotal: Math.round(faturamentoTotal * 100) / 100,
    valorVencido: Math.round(valorVencido * 100) / 100,
    ticketMedio: Math.round(ticketMedio * 100) / 100,
  };
}
