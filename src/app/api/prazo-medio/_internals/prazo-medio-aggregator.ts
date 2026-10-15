import { calcularPrazoConcedido, calcularPrazoRealizado } from "@/lib/utils/metrics-prazo-medio";
import type { TituloReceberAgregacao, BaixaReceberAgregacao } from "./prazo-medio-query";
import type { PrazoPorClienteDTO, PrazoPorMesDTO, PrazoTipoInfoDTO } from "../types";

export function formatCompetencia(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function agruparPrazoPorCliente(
  titulos: TituloReceberAgregacao[],
  baixas: BaixaReceberAgregacao[]
): PrazoPorClienteDTO[] {
  type Entry = { cliente: TituloReceberAgregacao["cliente"]; titulos: TituloReceberAgregacao[]; baixas: BaixaReceberAgregacao[] };
  const mapa = new Map<string, Entry>();

  for (const t of titulos) {
    const entry = mapa.get(t.clienteId) || { cliente: t.cliente, titulos: [], baixas: [] };
    entry.titulos.push(t);
    mapa.set(t.clienteId, entry);
  }

  for (const b of baixas) {
    const cid = b.contaReceber.clienteId;
    const entry = mapa.get(cid) || { cliente: b.contaReceber.cliente, titulos: [], baixas: [] };
    entry.baixas.push(b);
    mapa.set(cid, entry);
  }

  return Array.from(mapa.entries()).map(([clienteId, data]) => {
    const conc = calcularPrazoConcedido(data.titulos.map((t) => ({ valor: Number(t.valor), dataEmissao: t.dataEmissao, vencimento: t.vencimento })));
    const real = calcularPrazoRealizado(data.baixas.map((b) => ({
      valorBaixa: Number(b.valorBaixa), dataEmissao: b.contaReceber.dataEmissao,
      vencimento: b.contaReceber.vencimento, dataBaixa: b.dataBaixa,
    })));

    return {
      clienteId, codigo: data.cliente.codigo, loja: data.cliente.loja, nome: data.cliente.nome,
      valorTotal: conc.valorTotal, pmrConcedido: conc.prazoMedio, pmrRealizado: real.prazoRealizado, atrasoMedio: real.atrasoMedio,
    };
  }).sort((a, b) => b.valorTotal - a.valorTotal);
}

export function agruparPrazoPorMes(
  titulos: TituloReceberAgregacao[],
  baixas: BaixaReceberAgregacao[]
): PrazoPorMesDTO[] {
  const mapa = new Map<string, { titulos: TituloReceberAgregacao[]; baixas: BaixaReceberAgregacao[] }>();

  for (const t of titulos) {
    const comp = formatCompetencia(new Date(t.dataEmissao));
    const entry = mapa.get(comp) || { titulos: [], baixas: [] };
    entry.titulos.push(t);
    mapa.set(comp, entry);
  }

  for (const b of baixas) {
    const comp = formatCompetencia(new Date(b.dataBaixa));
    const entry = mapa.get(comp) || { titulos: [], baixas: [] };
    entry.baixas.push(b);
    mapa.set(comp, entry);
  }

  return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([competencia, data]) => {
    const conc = calcularPrazoConcedido(data.titulos.map((t) => ({ valor: Number(t.valor), dataEmissao: t.dataEmissao, vencimento: t.vencimento })));
    const real = calcularPrazoRealizado(data.baixas.map((b) => ({
      valorBaixa: Number(b.valorBaixa), dataEmissao: b.contaReceber.dataEmissao,
      vencimento: b.contaReceber.vencimento, dataBaixa: b.dataBaixa,
    })));
    return {
      competencia, pmrConcedido: conc.prazoMedio, pmrRealizado: real.prazoRealizado,
      pmpConcedido: null, pmpRealizado: null, valorTitulos: conc.valorTotal, valorBaixas: real.valorTotalBaixas,
      valorTitulosPagar: 0, valorBaixasPagar: 0,
    };
  });
}

export function extrairTiposConsiderados(
  todosTitulos: TituloReceberAgregacao[],
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
