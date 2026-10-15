import { diasEntre } from "./metrics-prazo-medio";

export type FaixaKey = "Vencido" | "0 a 30 dias" | "31 a 60 dias" | "61 a 90 dias" | "Mais de 90 dias";

export interface TituloAgingInput {
  saldo: number;
  vencimento: Date | string;
}

export interface FaixaVencimentoDTO {
  faixa: FaixaKey;
  quantidade: number;
  valorTotal: number;
  percentual: number;
}

export interface AgingResumoDTO {
  faixas: FaixaVencimentoDTO[];
  totalVencido: number;
  totalAVencer: number;
  totalGeral: number;
  quantidadeTotal: number;
}

const FAIXAS_ORDENADAS: FaixaKey[] = [
  "Vencido",
  "0 a 30 dias",
  "31 a 60 dias",
  "61 a 90 dias",
  "Mais de 90 dias",
];

function obterFaixa(diasAteVencimento: number): FaixaKey {
  if (diasAteVencimento < 0) return "Vencido";
  if (diasAteVencimento <= 30) return "0 a 30 dias";
  if (diasAteVencimento <= 60) return "31 a 60 dias";
  if (diasAteVencimento <= 90) return "61 a 90 dias";
  return "Mais de 90 dias";
}

export function calcularFaixasVencimento(
  titulos: TituloAgingInput[],
  dataReferencia: Date | string = new Date()
): AgingResumoDTO {
  const mapa = new Map<FaixaKey, { quantidade: number; valorTotal: number }>();
  for (const f of FAIXAS_ORDENADAS) {
    mapa.set(f, { quantidade: 0, valorTotal: 0 });
  }

  let totalGeral = 0;
  let totalVencido = 0;
  let totalAVencer = 0;
  let quantidadeTotal = 0;

  for (const t of titulos) {
    const s = Number(t.saldo) || 0;
    if (s <= 0) continue;

    const dias = diasEntre(dataReferencia, t.vencimento);
    const faixa = obterFaixa(dias);
    const item = mapa.get(faixa)!;
    item.quantidade += 1;
    item.valorTotal += s;
    totalGeral += s;
    quantidadeTotal += 1;

    if (faixa === "Vencido") {
      totalVencido += s;
    } else {
      totalAVencer += s;
    }
  }

  const faixas = FAIXAS_ORDENADAS.map((faixa) => {
    const d = mapa.get(faixa)!;
    const perc = totalGeral > 0 ? Math.round((d.valorTotal / totalGeral) * 1000) / 10 : 0;
    return {
      faixa,
      quantidade: d.quantidade,
      valorTotal: Math.round(d.valorTotal * 100) / 100,
      percentual: perc,
    };
  });

  return {
    faixas,
    totalVencido: Math.round(totalVencido * 100) / 100,
    totalAVencer: Math.round(totalAVencer * 100) / 100,
    totalGeral: Math.round(totalGeral * 100) / 100,
    quantidadeTotal,
  };
}
