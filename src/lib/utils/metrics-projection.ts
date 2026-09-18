import type { FaturamentoMes, ProjecaoPonto } from "@/lib/types/dashboard";

const MESES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export function formatMesAno(date: Date): string {
  return `${MESES_ABREV[date.getUTCMonth()]}/${date.getUTCFullYear()}`;
}

export function proximoMes(date: Date, offset: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d;
}

export function parseMesAno(mesAnoStr: string): Date {
  const [mesStr, anoStr] = mesAnoStr.split("/");
  const mesIndex = MESES_ABREV.indexOf(mesStr);
  const ano = parseInt(anoStr, 10);
  if (mesIndex !== -1 && !isNaN(ano)) {
    return new Date(Date.UTC(ano, mesIndex, 1));
  }
  return new Date();
}

export function buildProjecao(sortedMeses: FaturamentoMes[]): ProjecaoPonto[] {
  const projecao: ProjecaoPonto[] = sortedMeses.map((m) => ({
    mes: m.mes,
    real: Math.round(m.valor * 100) / 100,
    projetado: null,
  }));

  if (sortedMeses.length > 0) {
    const ultimosValores = sortedMeses.slice(-3).map((m) => m.valor);
    const ultimaData = parseMesAno(sortedMeses[sortedMeses.length - 1].mes);

    if (projecao.length > 0) {
      projecao[projecao.length - 1].projetado = projecao[projecao.length - 1].real;
    }

    for (let i = 1; i <= 3; i++) {
      const mediaMovel =
        ultimosValores.reduce((sum, val) => sum + val, 0) /
        (ultimosValores.length || 1);
      const valorProjetado = Math.round(mediaMovel * 100) / 100;

      const dataFutura = proximoMes(ultimaData, i);
      const mesFuturoLabel = formatMesAno(dataFutura);

      projecao.push({
        mes: mesFuturoLabel,
        real: null,
        projetado: valorProjetado,
      });
    }
  }

  return projecao;
}
