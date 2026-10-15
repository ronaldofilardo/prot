/**
 * Domínio puro: Fórmulas de PMR (Prazo Médio de Recebimento) e PMP (Pagamento).
 * Sem dependências de Prisma ou React.
 * Ponderações por valor e arredondamentos canônicos (§1 PLANO_PMR_PMP).
 */

export interface TituloPrazoInput {
  valor: number;
  dataEmissao: Date | string;
  vencimento: Date | string;
}

export interface BaixaPrazoInput {
  valorBaixa: number;
  dataEmissao: Date | string;
  vencimento: Date | string;
  dataBaixa: Date | string;
}

export function diasEntre(inicio: Date | string, fim: Date | string): number {
  const d1 = new Date(inicio);
  const d2 = new Date(fim);
  const msPorDia = 86_400_000;
  const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
  const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());
  return Math.round((utc2 - utc1) / msPorDia);
}

export function calcularPrazoConcedido(titulos: TituloPrazoInput[]): {
  prazoMedio: number | null;
  valorTotal: number;
  quantidade: number;
} {
  let somaPonderada = 0;
  let somaValor = 0;
  let quantidade = 0;

  for (const t of titulos) {
    const val = Number(t.valor) || 0;
    if (val <= 0) continue;
    const dias = diasEntre(t.dataEmissao, t.vencimento);
    somaPonderada += val * dias;
    somaValor += val;
    quantidade += 1;
  }

  return {
    prazoMedio: somaValor > 0 ? Math.round((somaPonderada / somaValor) * 10) / 10 : null,
    valorTotal: Math.round(somaValor * 100) / 100,
    quantidade,
  };
}

export function calcularPrazoRealizado(baixas: BaixaPrazoInput[]): {
  prazoRealizado: number | null;
  atrasoMedio: number | null;
  percentualAtraso: number | null;
  valorTotalBaixas: number;
  quantidade: number;
} {
  let somaPonderadaRealizado = 0;
  let somaPonderadaAtraso = 0;
  let somaValorBaixas = 0;
  let somaValorEmAtraso = 0;
  let quantidade = 0;

  for (const b of baixas) {
    const val = Number(b.valorBaixa) || 0;
    if (val <= 0) continue;
    const diasRealizado = diasEntre(b.dataEmissao, b.dataBaixa);
    const diasAtraso = diasEntre(b.vencimento, b.dataBaixa);

    somaPonderadaRealizado += val * diasRealizado;
    somaPonderadaAtraso += val * diasAtraso;
    somaValorBaixas += val;
    quantidade += 1;

    if (diasAtraso > 0) {
      somaValorEmAtraso += val;
    }
  }

  return {
    prazoRealizado: somaValorBaixas > 0 ? Math.round((somaPonderadaRealizado / somaValorBaixas) * 10) / 10 : null,
    atrasoMedio: somaValorBaixas > 0 ? Math.round((somaPonderadaAtraso / somaValorBaixas) * 10) / 10 : null,
    percentualAtraso: somaValorBaixas > 0 ? Math.round((somaValorEmAtraso / somaValorBaixas) * 1000) / 10 : null,
    valorTotalBaixas: Math.round(somaValorBaixas * 100) / 100,
    quantidade,
  };
}
