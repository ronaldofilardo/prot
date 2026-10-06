import { prisma, withEmpresaRLS } from "@/lib/db/prisma-client";
import type { EmpresaComFiliaisRow } from "@/lib/utils/empresa-grupo-dto";
import type { EmpresaHierarquia } from "@/lib/utils/empresa-grupo";

const SELECT_FILIAL = { id: true, nome: true, cnpj: true } as const;
const INCLUDE_HIERARQUIA = {
  filiais: { select: SELECT_FILIAL },
  matriz: { include: { filiais: { select: SELECT_FILIAL } } },
} as const;

function carregarEmpresaComHierarquia(id: string) {
  return prisma.empresa.findUnique({ where: { id }, include: INCLUDE_HIERARQUIA });
}

type EmpresaComHierarquia = NonNullable<Awaited<ReturnType<typeof carregarEmpresaComHierarquia>>>;

function extrairMatrizRow(empresa: EmpresaComHierarquia): EmpresaComFiliaisRow | null {
  if (empresa.matrizId === null) {
    return { id: empresa.id, nome: empresa.nome, cnpj: empresa.cnpj, matrizId: null, filiais: empresa.filiais };
  }
  if (!empresa.matriz) return null;
  return { id: empresa.matriz.id, nome: empresa.matriz.nome, cnpj: empresa.matriz.cnpj, matrizId: null, filiais: empresa.matriz.filiais };
}

export interface Hierarquias {
  hierarquias: EmpresaHierarquia[];
  matrizRowsPorId: Map<string, EmpresaComFiliaisRow>;
}

export async function carregarHierarquias(empresaId: string, usuarioId?: string): Promise<Hierarquias> {
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
  return { hierarquias, matrizRowsPorId };
}

function ensureFilialMap(idsConsulta: string[], filialMap?: Record<string, string>) {
  const mapa = filialMap || {};
  for (const id of idsConsulta) if (!mapa[id]) mapa[id] = "01";
  return mapa;
}

interface ClienteRow {
  id: string;
  codigo: string;
  loja: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
}

function fetchEmpresaData(tx: unknown, id: string) {
  return Promise.all([
    (tx as { cliente: { findMany: (args: unknown) => Promise<ClienteRow[]> } }).cliente.findMany({
      where: { ativo: true, empresaId: id },
      orderBy: { nome: "asc" },
    }),
    (tx as { faturamento: { findMany: (args: unknown) => Promise<unknown[]> } }).faturamento.findMany({
      where: { empresaId: id },
      include: { cliente: true },
      orderBy: { dataEmissao: "asc" },
    }),
    (tx as { contaReceber: { findMany: (args: unknown) => Promise<unknown[]> } }).contaReceber.findMany({
      where: { empresaId: id },
      include: { baixas: true, cliente: true },
      orderBy: { vencimento: "asc" },
    }),
  ]);
}

function hasProtheusCodigo(c: ClienteRow) {
  return Boolean(c.codigo && c.codigo.length === 6 && c.loja !== "undefined");
}

function filterProtheus(clientes: ClienteRow[]): ClienteRow[] {
  const temProtheus = clientes.some(hasProtheusCodigo);
  return temProtheus ? clientes.filter(hasProtheusCodigo) : clientes;
}

export async function carregarDadosFinanceiros(idsConsulta: string[], filialMap?: Record<string, string>) {
  const mapa = ensureFilialMap(idsConsulta, filialMap);
  const resultadosPorEmpresa = await Promise.all(
    idsConsulta.map((id) => withEmpresaRLS(id, (tx) => fetchEmpresaData(tx, id))),
  );
  const todosClientes = resultadosPorEmpresa.flatMap(([clientes]) => clientes);
  const clientes = filterProtheus(todosClientes);

  return {
    clientes,
    faturamentos: resultadosPorEmpresa.flatMap(([, faturamentos]) => faturamentos),
    contasReceber: resultadosPorEmpresa.flatMap(([, , contas]) => contas),
    filialMap: mapa,
  };
}