import type { Faturamento, ContaReceber } from "@/lib/types/dashboard";

export interface KPIsCalculados {
  faturamentoTotal: number;
  valorVencido: number;
  ticketMedio: number;
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
  const contasVencidas = contasReceberFiltrados.filter((cr) => {
    const totalBaixado = cr.baixas.reduce(
      (acc: number, b) => acc + Number(b.valorBaixa),
      0
    );
    const dataVenc = new Date(cr.vencimento);
    return dataVenc < hoje && totalBaixado < Number(cr.valor);
  });

  const valorVencido = contasVencidas.reduce((acc: number, cr: ContaReceber) => {
    const totalBaixado = cr.baixas.reduce(
      (acc: number, b) => acc + Number(b.valorBaixa),
      0
    );
    return acc + (Number(cr.valor) - totalBaixado);
  }, 0);

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
