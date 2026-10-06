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
import {
  resolveEmpresaIdsConsulta,
  resolveIdsPermitidosTotal,
} from "@/lib/utils/empresa-grupo";
import type { DashboardResponse, DashboardFilters } from "@/lib/types/dashboard";
import type { FaturamentoComCliente, ContaReceberComClienteEBaixas } from "@/lib/types/dashboard";
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

function buildFaturamentoData(faturamentosFiltrados: FaturamentoComCliente[]) {
  return {
    faturamentoMes: buildFaturamentoMes(faturamentosFiltrados),
    faturamentoCliente: buildFaturamentoCliente(faturamentosFiltrados),
    regiaoParticipacao: buildRegiaoParticipacao(faturamentosFiltrados),
    projecao: buildProjecao(buildFaturamentoMes(faturamentosFiltrados)),
    faturamentos: buildTabelaNotas(faturamentosFiltrados),
  };
}

function buildKpis(faturamentosFiltrados: FaturamentoComCliente[], contasReceberFiltrados: ContaReceberComClienteEBaixas[]) {
  const { faturamentoTotal, valorVencido, ticketMedio } = calcularKPIs(faturamentosFiltrados, contasReceberFiltrados);
  return { faturamentoTotal, valorVencido, ticketMedio };
}

function buildClientesInfo(dados: RespostaInput, faturamentosFiltrados: FaturamentoComCliente[]) {
  return {
    totalClientes: dados.clientes.length,
    clientesAtivosFiltrados: new Set(faturamentosFiltrados.map((f) => f.clienteId)).size,
    clientes: dados.clientes.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      nome: c.nome,
      cidade: c.cidade || "",
      estado: c.estado || "",
    })),
  };
}

function buildGruposInfo(dados: RespostaInput) {
  return { grupos: dados.grupos };
}

function montarDashboardResponse(dados: RespostaInput): DashboardResponse {
  const faturamentosFiltrados = filtrarFaturamentos(dados.faturamentos as FaturamentoComCliente[], dados.filters, dados.filialMap);
  const contasReceberFiltrados = filtrarContasReceber(dados.contasReceber as ContaReceberComClienteEBaixas[], dados.filters);
  const kpis = buildKpis(faturamentosFiltrados, contasReceberFiltrados);
  const faturamentoData = buildFaturamentoData(faturamentosFiltrados);
  const clientesInfo = buildClientesInfo(dados, faturamentosFiltrados);
  const gruposInfo = buildGruposInfo(dados);

  return { ...clientesInfo, ...kpis, ...faturamentoData, ...gruposInfo };
}

export async function buildDashboardReport({ empresaId, usuarioId, filters }: RelatorioParams): Promise<DashboardResponse> {
  const { hierarquias, matrizRowsPorId } = await carregarHierarquias(empresaId, usuarioId);

  const idsPermitidos = hierarquias.length > 0 ? resolveIdsPermitidosTotal(hierarquias) : [empresaId];
  const idsConsulta = resolveEmpresaIdsConsulta(idsPermitidos, filters.empresaIds);
  const grupos = buildGruposEmpresa(Array.from(matrizRowsPorId.values()));

  const dados = await carregarDadosFinanceiros(idsConsulta);
  return montarDashboardResponse({ ...dados, grupos, filters });
}