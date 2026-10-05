import type { EmpresaHierarquia } from "./empresa-hierarquia";
import { resolveEmpresaGroupIds } from "./empresa-hierarquia";

export * from "./empresa-hierarquia";

/**
 * Monta o `where` do Prisma para filtrar qualquer entidade com
 * `empresaId` por todo o grupo (matriz + filiais) em vez de uma única
 * empresa — uso: `prisma.faturamento.findMany({ where: whereEmpresaGrupo(empresa) })`.
 */
export function whereEmpresaGrupo(
  empresa: EmpresaHierarquia
): { empresaId: { in: string[] } } {
  return { empresaId: { in: resolveEmpresaGroupIds(empresa) } };
}

/**
 * Decide quais empresaId's efetivamente entram na consulta, cruzando o
 * que o usuário pediu no filtro (`idsSolicitados` — pode vir vazio, de
 * uma única filial, ou de várias) com o que ele tem permissão de ver
 * (`idsPermitidos`, normalmente o retorno de `resolveEmpresaGroupIds`
 * para a empresa da própria sessão).
 *
 * - Nada solicitado → assume o grupo inteiro (comportamento padrão do
 *   filtro, equivalente ao checkbox "Todas" vindo marcado).
 * - Solicitado, mas nada bate com o permitido (tentativa de acessar
 *   empresa de outro grupo/tenant, ou id inválido) → cai para o grupo
 *   inteiro em vez de vazar dados ou quebrar a consulta.
 * - Interseção não vazia → usa só o que foi pedido e é permitido,
 *   ignorando silenciosamente qualquer id fora do grupo.
 */
export function resolveEmpresaIdsConsulta(
  idsPermitidos: string[],
  idsSolicitados: string[]
): string[] {
  if (idsSolicitados.length === 0) {
    return idsPermitidos;
  }
  const permitidosSet = new Set(idsPermitidos);
  const intersecao = idsSolicitados.filter((id) => permitidosSet.has(id));
  return intersecao.length > 0 ? intersecao : idsPermitidos;
}
