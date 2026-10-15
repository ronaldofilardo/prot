import { resolveEmpresaIdsConsulta, resolveIdsPermitidosTotal } from "@/lib/utils/empresa-grupo";
import { carregarHierarquias } from "../../dashboard/_internals/dashboard-query";
import {
  carregarTitulosReceber, carregarBaixasReceber, isTipoElegivelReceber,
} from "../_internals/prazo-medio-query";
import {
  carregarTitulosPagar, carregarBaixasPagar, isTipoElegivelPagar,
} from "../_internals/prazo-pagar-query";
import {
  agruparPrazoPorCliente, agruparPrazoPorMes, extrairTiposConsiderados,
} from "../_internals/prazo-medio-aggregator";
import {
  agruparPrazoPorFornecedor, agruparPrazoPagarPorMes, extrairTiposConsideradosPagar,
} from "../_internals/prazo-pagar-aggregator";
import { mesclarEvolucaoMensal } from "../_internals/prazo-mensal-aggregator";
import { calcularPrazoConcedido, calcularPrazoRealizado } from "@/lib/utils/metrics-prazo-medio";
import { calcularFaixasVencimento } from "@/lib/utils/metrics-vencimentos";
import type { PrazoMedioFiltrosDTO, PrazoMedioResponseDTO } from "../types";

export async function buildPrazoMedioReport(
  empresaId: string,
  usuarioId: string | undefined,
  filters: PrazoMedioFiltrosDTO
): Promise<PrazoMedioResponseDTO> {
  const { hierarquias } = await carregarHierarquias(empresaId, usuarioId);
  const idsPermitidos = hierarquias.length > 0 ? resolveIdsPermitidosTotal(hierarquias) : [empresaId];
  const targetIds = resolveEmpresaIdsConsulta(idsPermitidos, filters.empresaIds);

  const [todosTitulos, todasBaixas, todosTitulosPagar, todasBaixasPagar] = await Promise.all([
    carregarTitulosReceber(targetIds, filters),
    carregarBaixasReceber(targetIds, filters),
    carregarTitulosPagar(targetIds, filters),
    carregarBaixasPagar(targetIds, filters),
  ]);

  const titulosFiltrados = todosTitulos.filter((t) => isTipoElegivelReceber(t.tipo));
  const baixasFiltradas = todasBaixas.filter((b) => isTipoElegivelReceber(b.tipo));
  const titulosPagarFiltrados = todosTitulosPagar.filter((t) => isTipoElegivelPagar(t.tipo));
  const baixasPagarFiltradas = todasBaixasPagar.filter((b) => isTipoElegivelPagar(b.tipo));

  const concedidoKpi = calcularPrazoConcedido(titulosFiltrados.map((t) => ({ valor: Number(t.valor), dataEmissao: t.dataEmissao, vencimento: t.vencimento })));
  const pmpConcedidoKpi = calcularPrazoConcedido(titulosPagarFiltrados.map((t) => ({ valor: Number(t.valor), dataEmissao: t.dataEmissao, vencimento: t.vencimento })));
  const realizadoKpi = calcularPrazoRealizado(baixasFiltradas.map((b) => ({
    valorBaixa: Number(b.valorBaixa), dataEmissao: b.contaReceber.dataEmissao, vencimento: b.contaReceber.vencimento, dataBaixa: b.dataBaixa,
  })));
  const pmpRealizadoKpi = calcularPrazoRealizado(baixasPagarFiltradas.map((b) => ({
    valorBaixa: Number(b.valorBaixa), dataEmissao: b.contaPagar.dataEmissao, vencimento: b.contaPagar.vencimento, dataBaixa: b.dataBaixa,
  })));

  const agingReceber = calcularFaixasVencimento(titulosFiltrados.map((t) => ({ saldo: Number(t.saldo), vencimento: t.vencimento })));
  const agingPagar = calcularFaixasVencimento(titulosPagarFiltrados.map((t) => ({ saldo: Number(t.saldo), vencimento: t.vencimento })));

  return {
    kpis: {
      pmrConcedido: concedidoKpi.prazoMedio, pmrRealizado: realizadoKpi.prazoRealizado,
      pmpConcedido: pmpConcedidoKpi.prazoMedio, pmpRealizado: pmpRealizadoKpi.prazoRealizado,
      atrasoMedio: realizadoKpi.atrasoMedio, atrasoMedioPagar: pmpRealizadoKpi.atrasoMedio,
      percentualAtraso: realizadoKpi.percentualAtraso, percentualAtrasoPagar: pmpRealizadoKpi.percentualAtraso,
      valorTotalTitulos: concedidoKpi.valorTotal, valorTotalBaixas: realizadoKpi.valorTotalBaixas,
      quantidadeTitulos: concedidoKpi.quantidade, quantidadeBaixas: realizadoKpi.quantidade,
      valorTotalTitulosPagar: pmpConcedidoKpi.valorTotal, valorTotalBaixasPagar: pmpRealizadoKpi.valorTotalBaixas,
      quantidadeTitulosPagar: pmpConcedidoKpi.quantidade, quantidadeBaixasPagar: pmpRealizadoKpi.quantidade,
    },
    porCliente: agruparPrazoPorCliente(titulosFiltrados, baixasFiltradas),
    porFornecedor: agruparPrazoPorFornecedor(titulosPagarFiltrados, baixasPagarFiltradas),
    evolucaoMensal: mesclarEvolucaoMensal(
      agruparPrazoPorMes(titulosFiltrados, baixasFiltradas),
      agruparPrazoPagarPorMes(titulosPagarFiltrados, baixasPagarFiltradas)
    ),
    tiposConsiderados: extrairTiposConsiderados(todosTitulos, isTipoElegivelReceber),
    tiposConsideradosPagar: extrairTiposConsideradosPagar(todosTitulosPagar, isTipoElegivelPagar),
    agingReceber,
    agingPagar,
  };
}
