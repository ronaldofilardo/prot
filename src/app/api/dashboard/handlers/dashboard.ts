import {
  filtrarFaturamentos,
  filtrarContasReceber,
  calcularKPIs,
  buildFaturamentoMes,
  buildFaturamentoCliente,
  buildRegiaoParticipacao,
  buildProjecao,
  buildTabelaNotas,
} from "@/lib/utils/dashboardMetrics";
import { buildGruposEmpresa } from "@/lib/utils/empresa-grupo-dto";
import { resolveEmpresaIdsConsulta, resolveIdsPermitidosTotal } from "@/lib/utils/empresa-grupo";
import type { DashboardResponse, DashboardFilters } from "@/lib/types/dashboard";
import { carregarDadosFinanceiros, carregarHierarquias } from "../_internals/dashboard-query";

type DadosFinanceiros = Awaited<ReturnType<typeof carregarDadosFinanceiros>>;

interface RespostaInput extends DadosFinanceiros {
  grupos: ReturnType<typeof buildGruposEmpresa>;
  filters: DashboardFilters;
}

interface RelatorioParams {
  empresaId: string;
  usuarioId?: string;
  filters: DashboardFilters;
}

function montarDashboardResponse(dados: RespostaInput): DashboardResponse {
  const faturamentosFiltrados = filtrarFaturamentos(dados.faturamentos, dados.filters);
  const contasReceberFiltrados = filtrarContasReceber(dados.contasReceber, dados.filters);
  const { faturamentoTotal, valorVencido, ticketMedio } = calcularKPIs(
    faturamentosFiltrados,
    contasReceberFiltrados
  );
  const faturamentoMes = buildFaturamentoMes(faturamentosFiltrados);
  return {
    totalClientes: dados.clientes.length,
    clientesAtivosFiltrados: new Set(faturamentosFiltrados.map((f) => f.clienteId)).size,
    faturamentoTotal,
    valorVencido,
    ticketMedio,
    faturamentos: buildTabelaNotas(faturamentosFiltrados),
    faturamentoMes,
    faturamentoCliente: buildFaturamentoCliente(faturamentosFiltrados),
    regiaoParticipacao: buildRegiaoParticipacao(faturamentosFiltrados),
    projecao: buildProjecao(faturamentoMes),
    clientes: dados.clientes,
    grupos: dados.grupos,
  };
}

export async function buildDashboardReport({
  empresaId,
  usuarioId,
  filters,
}: RelatorioParams): Promise<DashboardResponse> {
  const { hierarquias, matrizRowsPorId } = await carregarHierarquias(empresaId, usuarioId);

  const idsPermitidos = hierarquias.length > 0 ? resolveIdsPermitidosTotal(hierarquias) : [empresaId];
  const idsConsulta = resolveEmpresaIdsConsulta(idsPermitidos, filters.empresaIds);
  // Um "grupo" por matriz distinta acessível — cada empresa
  // independente (sem filial) vira um grupo com filiais: [], o que
  // já é suficiente para listá-la pelo nome no seletor da UI.
  const grupos = buildGruposEmpresa(Array.from(matrizRowsPorId.values()));

  const dados = await carregarDadosFinanceiros(idsConsulta);
  return montarDashboardResponse({ ...dados, grupos, filters });
}
