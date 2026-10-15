import type { PrazoPorMesDTO } from "../types";

export type PagarMesInfo = {
  pmpConcedido: number | null;
  pmpRealizado: number | null;
  valorTitulosPagar: number;
  valorBaixasPagar: number;
};

function extractRecValores(rec?: PrazoPorMesDTO) {
  if (!rec) {
    return { pmrConcedido: null, pmrRealizado: null, valorTitulos: 0, valorBaixas: 0 };
  }
  return {
    pmrConcedido: rec.pmrConcedido,
    pmrRealizado: rec.pmrRealizado,
    valorTitulos: rec.valorTitulos,
    valorBaixas: rec.valorBaixas,
  };
}

function extractPagValores(pag?: PagarMesInfo) {
  if (!pag) {
    return { pmpConcedido: null, pmpRealizado: null, valorTitulosPagar: 0, valorBaixasPagar: 0 };
  }
  return {
    pmpConcedido: pag.pmpConcedido,
    pmpRealizado: pag.pmpRealizado,
    valorTitulosPagar: pag.valorTitulosPagar,
    valorBaixasPagar: pag.valorBaixasPagar,
  };
}

export function mesclarEvolucaoMensal(
  evolucaoReceber: PrazoPorMesDTO[],
  mapaPagar: Map<string, PagarMesInfo>
): PrazoPorMesDTO[] {
  const meses = new Set([...evolucaoReceber.map((m) => m.competencia), ...mapaPagar.keys()]);
  const mapaReceber = new Map(evolucaoReceber.map((m) => [m.competencia, m]));

  return Array.from(meses).sort().map((competencia) => {
    const r = extractRecValores(mapaReceber.get(competencia));
    const p = extractPagValores(mapaPagar.get(competencia));
    return {
      competencia,
      pmrConcedido: r.pmrConcedido,
      pmrRealizado: r.pmrRealizado,
      pmpConcedido: p.pmpConcedido,
      pmpRealizado: p.pmpRealizado,
      valorTitulos: r.valorTitulos,
      valorBaixas: r.valorBaixas,
      valorTitulosPagar: p.valorTitulosPagar,
      valorBaixasPagar: p.valorBaixasPagar,
    };
  });
}
