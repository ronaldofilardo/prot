import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, withEmpresaRLS } from "@/lib/db/prisma-client";
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
import { buildGruposEmpresa, type EmpresaComFiliaisRow } from "@/lib/utils/empresa-grupo-dto";
import {
  resolveEmpresaIdsConsulta,
  resolveIdsPermitidosTotal,
  type EmpresaHierarquia,
} from "@/lib/utils/empresa-grupo";
import { logApiError } from "@/lib/utils/logger";
import type { DashboardResponse, DashboardFilters } from "@/lib/types/dashboard";

const SELECT_FILIAL = { id: true, nome: true, cnpj: true } as const;
const INCLUDE_HIERARQUIA = {
  filiais: { select: SELECT_FILIAL },
  matriz: { include: { filiais: { select: SELECT_FILIAL } } },
} as const;

/**
 * A partir de uma Empresa carregada com `INCLUDE_HIERARQUIA`, retorna a
 * linha da sua matriz pronta para `buildGruposEmpresa` — a própria
 * empresa quando ela já é a matriz (ou é independente, sem filial
 * nenhuma), ou `empresa.matriz` quando ela é uma filial.
 */
function extrairMatrizRow(
  empresa: NonNullable<Awaited<ReturnType<typeof carregarEmpresaComHierarquia>>>
): EmpresaComFiliaisRow | null {
  if (empresa.matrizId === null) {
    return { id: empresa.id, nome: empresa.nome, cnpj: empresa.cnpj, matrizId: null, filiais: empresa.filiais };
  }
  if (!empresa.matriz) return null;
  return {
    id: empresa.matriz.id,
    nome: empresa.matriz.nome,
    cnpj: empresa.matriz.cnpj,
    matrizId: null,
    filiais: empresa.matriz.filiais,
  };
}

function carregarEmpresaComHierarquia(id: string) {
  return prisma.empresa.findUnique({ where: { id }, include: INCLUDE_HIERARQUIA });
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { usuarioId?: string; empresaId?: string } | undefined;
    const empresaId = sessionUser?.empresaId;
    const usuarioId = sessionUser?.usuarioId;

    if (!empresaId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: DashboardFilters = {
      cliente: searchParams.get("cliente") || "",
      dataInicial: searchParams.get("inicial") || "",
      dataFinal: searchParams.get("final") || "",
      matrizId: searchParams.get("matriz") || null,
      empresaIds: searchParams.getAll("empresaId"),
    };

    // `Empresa` e `UsuarioEmpresaAcesso` não têm RLS habilitada (só os
    // dados financeiros têm) — dá para carregar aqui, fora da policy,
    // toda a estrutura de empresas que o usuário pode acessar:
    // 1) a empresa da sua própria sessão (matriz+filiais, ou a matriz
    //    dela caso a sessão seja de uma filial);
    // 2) empresas extras liberadas via UsuarioEmpresaAcesso — caso do
    //    CFO que gere várias empresas independentes, cada uma com seu
    //    próprio CNPJ e sem relação de matriz/filial entre si.
    const acessosExtras = usuarioId
      ? await prisma.usuarioEmpresaAcesso.findMany({ where: { usuarioId }, select: { empresaId: true } })
      : [];
    const idsParaCarregar = [empresaId, ...acessosExtras.map((a) => a.empresaId)];
    const empresasCarregadas = await Promise.all(idsParaCarregar.map(carregarEmpresaComHierarquia));

    const hierarquias: EmpresaHierarquia[] = [];
    const matrizRowsPorId = new Map<string, EmpresaComFiliaisRow>();
    for (const empresa of empresasCarregadas) {
      if (!empresa) continue;
      hierarquias.push(empresa);
      const matrizRow = extrairMatrizRow(empresa);
      if (matrizRow) matrizRowsPorId.set(matrizRow.id, matrizRow);
    }

    const idsPermitidos = hierarquias.length > 0 ? resolveIdsPermitidosTotal(hierarquias) : [empresaId];
    const idsConsulta = resolveEmpresaIdsConsulta(idsPermitidos, filters.empresaIds);
    // Um "grupo" por matriz distinta acessível — cada empresa
    // independente (sem filial) vira um grupo com filiais: [], o que
    // já é suficiente para listá-la pelo nome no seletor da UI.
    const grupos = buildGruposEmpresa(Array.from(matrizRowsPorId.values()));

    // Antes: buscava todos os registros do banco, sem filtrar por empresa —
    // qualquer segundo cliente Protheus veria os dados de todos os outros.
    // Depois: filtrava só pelo empresaId da sessão via RLS. Agora: roda uma
    // consulta com RLS por empresaId do grupo selecionado (`idsConsulta`) e
    // junta os resultados — a RLS (`empresa_isolation`) só aceita comparar
    // com um único id por vez, então em vez de mudar a policy para `= ANY`
    // (mudança maior, exige nova migration), disparamos uma transação RLS
    // por empresa e mesclamos aqui na aplicação.
    const resultadosPorEmpresa = await Promise.all(
      idsConsulta.map((id) =>
        withEmpresaRLS(id, (tx) =>
          Promise.all([
            tx.cliente.findMany({ where: { ativo: true, empresaId: id }, orderBy: { nome: "asc" } }),
            tx.faturamento.findMany({
              where: { empresaId: id },
              include: { cliente: true },
              orderBy: { dataEmissao: "asc" },
            }),
            tx.contaReceber.findMany({
              where: { empresaId: id },
              include: { baixas: true, cliente: true },
              orderBy: { vencimento: "asc" },
            }),
          ])
        )
      )
    );
    const todosClientes = resultadosPorEmpresa.flatMap(([clientes]) => clientes);
    const todosFaturamentos = resultadosPorEmpresa.flatMap(([, faturamentos]) => faturamentos);
    const contasReceber = resultadosPorEmpresa.flatMap(([, , contas]) => contas);

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
      grupos,
    };

    return NextResponse.json(response);
  } catch (error) {
    logApiError("Erro ao buscar dados do dashboard", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

