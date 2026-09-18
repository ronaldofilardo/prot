import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withEmpresaRLS } from "@/lib/db/prisma-client";
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
import { logApiError } from "@/lib/utils/logger";
import type { DashboardResponse, DashboardFilters } from "@/lib/types/dashboard";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const empresaId = (session?.user as { empresaId?: string } | undefined)?.empresaId;

    if (!empresaId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: DashboardFilters = {
      cliente: searchParams.get("cliente") || "",
      dataInicial: searchParams.get("inicial") || "",
      dataFinal: searchParams.get("final") || "",
    };

    // Antes: buscava todos os registros do banco, sem filtrar por empresa —
    // qualquer segundo cliente Protheus veria os dados de todos os outros.
    // Agora filtra por empresaId da sessão E roda dentro da policy de RLS
    // (empresa_isolation) como segunda camada de proteção.
    const [todosClientes, todosFaturamentos, contasReceber] = await withEmpresaRLS(
      empresaId,
      (tx) =>
        Promise.all([
          tx.cliente.findMany({ where: { ativo: true, empresaId }, orderBy: { nome: "asc" } }),
          tx.faturamento.findMany({
            where: { empresaId },
            include: { cliente: true },
            orderBy: { dataEmissao: "asc" },
          }),
          tx.contaReceber.findMany({
            where: { empresaId },
            include: { baixas: true, cliente: true },
            orderBy: { vencimento: "asc" },
          }),
        ])
    );

    const faturamentosFiltrados = filtrarFaturamentos(todosFaturamentos, filters);
    const contasReceberFiltrados = filtrarContasReceber(contasReceber, filters);
    const { faturamentoTotal, valorVencido, ticketMedio } = calcularKPIs(faturamentosFiltrados, contasReceberFiltrados);

    const faturamentoMes = buildFaturamentoMes(faturamentosFiltrados);
    const response: DashboardResponse = {
      totalClientes: todosClientes.length,
      clientesAtivosFiltrados: new Set(faturamentosFiltrados.map((f) => f.clienteId)).size,
      faturamentoTotal,
      valorVencido,
      ticketMedio,
      faturamentos: buildTabelaNotas(faturamentosFiltrados),
      faturamentoMes,
      faturamentoCliente: buildFaturamentoCliente(faturamentosFiltrados),
      regiaoParticipacao: buildRegiaoParticipacao(faturamentosFiltrados),
      projecao: buildProjecao(faturamentoMes),
      clientes: todosClientes,
    };

    return NextResponse.json(response);
  } catch (error) {
    logApiError("Erro ao buscar dados do dashboard", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
