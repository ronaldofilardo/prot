/**
 * Resolução da estrutura matriz/filial.
 *
 * Um CFO gere um grupo (Tenant) que pode conter várias Empresas, e cada
 * Empresa pode ser uma matriz com uma ou mais filiais (`Empresa.matrizId`).
 * Este módulo concentra a lógica pura de "quais empresaId's compõem o
 * grupo de uma empresa", para ser usada ao filtrar consultas (dashboard,
 * métricas, sincronização) que hoje trabalham com um único `empresaId`.
 */

export interface EmpresaRef {
  id: string;
}

export interface EmpresaHierarquia {
  id: string;
  matrizId: string | null;
  /** Presente quando a própria empresa é matriz (suas filiais diretas). */
  filiais?: EmpresaRef[];
  /** Presente quando a própria empresa é filial. */
  matriz?: {
    id: string;
    /** Filiais irmãs, incluindo (opcionalmente) a própria empresa. */
    filiais?: EmpresaRef[];
  } | null;
}

/**
 * true quando a empresa não tem matrizId, ou seja, é ela própria a
 * cabeça (matriz) do seu (sub)grupo.
 */
export function isMatriz(empresa: Pick<EmpresaHierarquia, "matrizId">): boolean {
  return empresa.matrizId === null || empresa.matrizId === undefined;
}

/**
 * Retorna, em ordem estável e sem duplicatas, todos os empresaId que
 * pertencem ao mesmo grupo matriz/filiais de `empresa`:
 *
 * - Se `empresa` é a matriz: [matriz, ...filiais diretas].
 * - Se `empresa` é uma filial: [matriz, ...todas as filiais da matriz]
 *   (inclui a própria empresa e eventuais empresas irmãs).
 *
 * Não faz nenhuma consulta ao banco — recebe os dados já carregados
 * (via Prisma `include`) para permanecer uma função pura e testável.
 */
export function resolveEmpresaGroupIds(empresa: EmpresaHierarquia): string[] {
  const ids = new Set<string>();
  ids.add(empresa.id);

  if (isMatriz(empresa)) {
    for (const filial of empresa.filiais ?? []) {
      ids.add(filial.id);
    }
    return Array.from(ids);
  }

  // É filial: inclui a matriz e todas as filiais irmãs conhecidas.
  if (empresa.matrizId) {
    ids.add(empresa.matrizId);
  }
  for (const irmã of empresa.matriz?.filiais ?? []) {
    ids.add(irmã.id);
  }
  return Array.from(ids);
}

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

/**
 * União dos ids permitidos de vários grupos acessíveis por um mesmo
 * usuário — caso do CFO que gere tanto a sua própria empresa (com ou
 * sem filiais) quanto empresas extras liberadas via
 * `UsuarioEmpresaAcesso` (empresas independentes, sem relação de
 * matriz/filial entre si, cada uma com seu próprio CNPJ). Cada entrada
 * de `hierarquias` já deve trazer sua própria estrutura carregada
 * (filiais e/ou matriz.filiais); esta função só junta e deduplica os
 * grupos resultantes, sem fazer I/O.
 */
export function resolveIdsPermitidosTotal(hierarquias: EmpresaHierarquia[]): string[] {
  const ids = new Set<string>();
  for (const hierarquia of hierarquias) {
    for (const id of resolveEmpresaGroupIds(hierarquia)) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}
