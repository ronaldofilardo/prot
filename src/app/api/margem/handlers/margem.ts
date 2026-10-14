import { resolveEmpresaIdsConsulta, resolveIdsPermitidosTotal } from "@/lib/utils/empresa-grupo";
import { carregarHierarquias } from "../../dashboard/_internals/dashboard-query";
import { carregarItensMargem, type ItemVendaRowAgregacao } from "../_internals/margem-query";
import { calcularMetricasMargem, roundMoney } from "@/lib/utils/metrics-margem";
import type { MargemFiltrosDTO, MargemPorClienteDTO, MargemPorPeriodoDTO, MargemResponseDTO } from "../types";

export function formatCompetencia(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function agruparPorCliente(itens: ItemVendaRowAgregacao[]): MargemPorClienteDTO[] {
  const mapa = new Map<string, { cliente: ItemVendaRowAgregacao["cliente"]; receita: number; custo: number }>();

  for (const item of itens) {
    const cid = item.clienteId;
    const r = Number(item.valorTotal) || 0;
    const c = Number(item.custo) || 0;

    const atual = mapa.get(cid) || { cliente: item.cliente, receita: 0, custo: 0 };
    atual.receita += r;
    atual.custo += c;
    mapa.set(cid, atual);
  }

  return Array.from(mapa.entries()).map(([clienteId, dados]) => {
    const margemValor = dados.receita - dados.custo;
    const margemPercentual = dados.custo > 0 && dados.receita > 0 ? (margemValor / dados.receita) * 100 : 0;

    return {
      clienteId,
      codigo: dados.cliente.codigo,
      loja: dados.cliente.loja,
      nome: dados.cliente.nome,
      receita: roundMoney(dados.receita),
      custo: roundMoney(dados.custo),
      margemValor: roundMoney(margemValor),
      margemPercentual: roundMoney(margemPercentual),
      possuiCustoApurado: dados.custo > 0,
    };
  }).sort((a, b) => b.margemValor - a.margemValor);
}

export function agruparPorPeriodo(itens: ItemVendaRowAgregacao[]): MargemPorPeriodoDTO[] {
  const mapa = new Map<string, { receita: number; custo: number }>();

  for (const item of itens) {
    const comp = formatCompetencia(new Date(item.dataEmissao));
    const r = Number(item.valorTotal) || 0;
    const c = Number(item.custo) || 0;

    const atual = mapa.get(comp) || { receita: 0, custo: 0 };
    atual.receita += r;
    atual.custo += c;
    mapa.set(comp, atual);
  }
  return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([competencia, dados]) => {
    const margemValor = dados.receita - dados.custo;
    const margemPercentual = dados.custo > 0 && dados.receita > 0 ? (margemValor / dados.receita) * 100 : 0;
    return {
      competencia,
      receita: roundMoney(dados.receita),
      custo: roundMoney(dados.custo),
      margemValor: roundMoney(margemValor),
      margemPercentual: roundMoney(margemPercentual),
    };
  });
}

export async function buildMargemReport(
  empresaId: string,
  usuarioId: string | undefined,
  filters: MargemFiltrosDTO
): Promise<MargemResponseDTO> {
  const { hierarquias } = await carregarHierarquias(empresaId, usuarioId);
  const idsPermitidos = hierarquias.length > 0 ? resolveIdsPermitidosTotal(hierarquias) : [empresaId];
  const idsConsulta = resolveEmpresaIdsConsulta(idsPermitidos, filters.empresaIds);

  const itens = await carregarItensMargem(idsConsulta, filters);
  const metricas = calcularMetricasMargem(itens.map((it) => ({ receita: Number(it.valorTotal), custo: Number(it.custo) })));

  return {
    kpis: { ...metricas, quantidadeItens: itens.length },
    porCliente: agruparPorCliente(itens),
    evolucaoTemporal: agruparPorPeriodo(itens),
  };
}
