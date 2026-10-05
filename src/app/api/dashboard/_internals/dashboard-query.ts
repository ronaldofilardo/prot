import { prisma, withEmpresaRLS } from "@/lib/db/prisma-client";
import type { EmpresaComFiliaisRow } from "@/lib/utils/empresa-grupo-dto";
import type { EmpresaHierarquia } from "@/lib/utils/empresa-grupo";

const SELECT_FILIAL = { id: true, nome: true, cnpj: true } as const;
const INCLUDE_HIERARQUIA = {
  filiais: { select: SELECT_FILIAL },
  matriz: { include: { filiais: { select: SELECT_FILIAL } } },
} as const;

function carregarEmpresaComHierarquia(id: string) {
  return prisma.empresa.findUnique({
    where: { id },
    include: INCLUDE_HIERARQUIA,
  });
}

type EmpresaComHierarquia = NonNullable<
  Awaited<ReturnType<typeof carregarEmpresaComHierarquia>>
>;

/**
 * A partir de uma Empresa carregada com `INCLUDE_HIERARQUIA`, retorna a
 * linha da sua matriz pronta para `buildGruposEmpresa` — a própria
 * empresa quando ela já é a matriz (ou é independente, sem filial
 * nenhuma), ou `empresa.matriz` quando ela é uma filial.
 */
function extrairMatrizRow(
  empresa: EmpresaComHierarquia,
): EmpresaComFiliaisRow | null {
  if (empresa.matrizId === null) {
    return {
      id: empresa.id,
      nome: empresa.nome,
      cnpj: empresa.cnpj,
      matrizId: null,
      filiais: empresa.filiais,
    };
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

export interface Hierarquias {
  hierarquias: EmpresaHierarquia[];
  matrizRowsPorId: Map<string, EmpresaComFiliaisRow>;
}

/**
 * `Empresa` e `UsuarioEmpresaAcesso` não têm RLS habilitada (só os
 * dados financeiros têm) — dá para carregar aqui, fora da policy,
 * toda a estrutura de empresas que o usuário pode acessar:
 * 1) a empresa da sua própria sessão (matriz+filiais, ou a matriz
 *    dela caso a sessão seja de uma filial);
 * 2) empresas extras liberadas via UsuarioEmpresaAcesso — caso do
 *    CFO que gere várias empresas independentes, cada uma com seu
 *    próprio CNPJ e sem relação de matriz/filial entre si.
 */
export async function carregarHierarquias(
  empresaId: string,
  usuarioId?: string,
): Promise<Hierarquias> {
  const acessosExtras = usuarioId
    ? await prisma.usuarioEmpresaAcesso.findMany({
        where: { usuarioId },
        select: { empresaId: true },
      })
    : [];
  const idsParaCarregar = [empresaId, ...acessosExtras.map((a) => a.empresaId)];
  const empresasCarregadas = await Promise.all(
    idsParaCarregar.map(carregarEmpresaComHierarquia),
  );

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

/**
 * Antes: buscava todos os registros do banco, sem filtrar por empresa —
 * qualquer segundo cliente Protheus veria os dados de todos os outros.
 * Depois: filtrava só pelo empresaId da sessão via RLS. Agora: roda uma
 * consulta com RLS por empresaId do grupo selecionado (`idsConsulta`) e
 * junta os resultados — a RLS (`empresa_isolation`) só aceita comparar
 * com um único id por vez, então em vez de mudar a policy para `= ANY`
 * (mudança maior, exige nova migration), disparamos uma transação RLS
 * por empresa e mesclamos aqui na aplicação.
 */
export async function carregarDadosFinanceiros(
  idsConsulta: string[],
  filialMap?: Record<string, string>,
) {
  // Se filialMap não foi fornecido, cria um mapa simples (fallback)
  const mapa = filialMap || {};
  for (const id of idsConsulta) {
    if (!mapa[id]) {
      mapa[id] = "01"; // fallback: assume filial 01
    }
  }

  const resultadosPorEmpresa = await Promise.all(
    idsConsulta.map((id) =>
      withEmpresaRLS(id, (tx) =>
        Promise.all([
          tx.cliente.findMany({
            where: { ativo: true, empresaId: id },
            orderBy: { nome: "asc" },
          }),
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
        ]),
      ),
    ),
  );
  return {
    clientes: resultadosPorEmpresa.flatMap(([clientes]) => clientes),
    faturamentos: resultadosPorEmpresa.flatMap(
      ([, faturamentos]) => faturamentos,
    ),
    contasReceber: resultadosPorEmpresa.flatMap(([, , contas]) => contas),
    filialMap,
  };
}
