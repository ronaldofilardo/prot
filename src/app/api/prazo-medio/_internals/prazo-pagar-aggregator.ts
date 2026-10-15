import { calcularPrazoConcedido, calcularPrazoRealizado } from "@/lib/utils/metrics-prazo-medio";
import type { TituloPagarAgregacao, BaixaPagarAgregacao } from "./prazo-pagar-query";
import type { PrazoPorFornecedorDTO, PrazoTipoInfoDTO } from "../types";
import { formatCompetencia } from "./prazo-medio-aggregator";
import type { PagarMesInfo } from "./prazo-mensal-aggregator";

export function agruparPrazoPorFornecedor(
  titulos: TituloPagarAgregacao[],
  baixas: BaixaPagarAgregacao[] = []
): PrazoPorFornecedorDTO[] {
  const mapa = new Map<string, {
    cod: string; loja: string; nome: string;
    titulos: TituloPagarAgregacao[]; baixas: BaixaPagarAgregacao[];
  }>();

  for (const t of titulos) {
    const k = `${t.fornecedorCodigo}-${t.fornecedorLoja}`;
    const e = mapa.get(k) || { cod: t.fornecedorCodigo, loja: t.fornecedorLoja, nome: t.fornecedorNome, titulos: [], baixas: [] };
    if (t.fornecedorNome) e.nome = t.fornecedorNome;
    e.titulos.push(t);
    mapa.set(k, e);
  }

  for (const b of baixas) {
    const cp = b.contaPagar;
    const k = `${cp.fornecedorCodigo}-${cp.fornecedorLoja}`;
    const e = mapa.get(k) || { cod: cp.fornecedorCodigo, loja: cp.fornecedorLoja, nome: cp.fornecedorNome, titulos: [], baixas: [] };
    if (cp.fornecedorNome) e.nome = cp.fornecedorNome;
    e.baixas.push(b);
    mapa.set(k, e);
  }

  return Array.from(mapa.values()).map((item) => {
    const conc = calcularPrazoConcedido(item.titulos.map((t) => ({ valor: Number(t.valor), dataEmissao: t.dataEmissao, vencimento: t.vencimento })));
    const real = calcularPrazoRealizado(item.baixas.map((b) => ({
      valorBaixa: Number(b.valorBaixa), dataEmissao: b.contaPagar.dataEmissao, vencimento: b.contaPagar.vencimento, dataBaixa: b.dataBaixa,
    })));
    return {
      fornecedorCodigo: item.cod, fornecedorLoja: item.loja,
      nome: item.nome || `Fornecedor ${item.cod}`, valorTotal: conc.valorTotal,
      pmpConcedido: conc.prazoMedio, pmpRealizado: real.prazoRealizado,
      atrasoMedio: real.atrasoMedio, quantidadeTitulos: item.titulos.length, quantidadeBaixas: item.baixas.length,
    };
  }).sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0));
}

export function agruparPrazoPagarPorMes(
  titulos: TituloPagarAgregacao[],
  baixas: BaixaPagarAgregacao[] = []
): Map<string, PagarMesInfo> {
  const mapaTitulos = new Map<string, TituloPagarAgregacao[]>();
  for (const t of titulos) {
    const c = formatCompetencia(new Date(t.dataEmissao));
    mapaTitulos.set(c, [...(mapaTitulos.get(c) || []), t]);
  }

  const mapaBaixas = new Map<string, BaixaPagarAgregacao[]>();
  for (const b of baixas) {
    const c = formatCompetencia(new Date(b.dataBaixa));
    mapaBaixas.set(c, [...(mapaBaixas.get(c) || []), b]);
  }

  const meses = new Set([...mapaTitulos.keys(), ...mapaBaixas.keys()]);
  const resultado = new Map<string, PagarMesInfo>();

  for (const m of meses) {
    const tList = mapaTitulos.get(m) || [];
    const bList = mapaBaixas.get(m) || [];
    const conc = calcularPrazoConcedido(tList.map((t) => ({ valor: Number(t.valor), dataEmissao: t.dataEmissao, vencimento: t.vencimento })));
    const real = calcularPrazoRealizado(bList.map((b) => ({
      valorBaixa: Number(b.valorBaixa), dataEmissao: b.contaPagar.dataEmissao, vencimento: b.contaPagar.vencimento, dataBaixa: b.dataBaixa,
    })));
    resultado.set(m, {
      pmpConcedido: conc.prazoMedio, pmpRealizado: real.prazoRealizado,
      valorTitulosPagar: conc.valorTotal, valorBaixasPagar: real.valorTotalBaixas,
    });
  }
  return resultado;
}

export function extrairTiposConsideradosPagar(
  todosTitulos: TituloPagarAgregacao[],
  isElegivel: (t: string) => boolean
): PrazoTipoInfoDTO[] {
  const mapa = new Map<string, { quantidade: number; total: number; considerado: boolean }>();
  for (const t of todosTitulos) {
    const tipo = (t.tipo || "(vazio)").trim().toUpperCase();
    const atual = mapa.get(tipo) || { quantidade: 0, total: 0, considerado: isElegivel(tipo) };
    atual.quantidade += 1;
    atual.total += Number(t.valor) || 0;
    mapa.set(tipo, atual);
  }
  return Array.from(mapa.entries()).map(([tipo, d]) => ({
    tipo, quantidade: d.quantidade, total: Math.round(d.total * 100) / 100, considerado: d.considerado,
  })).sort((a, b) => b.total - a.total);
}
