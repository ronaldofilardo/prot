import type { EmpresaGrupoDTO, FilialFiltroDTO } from "@/lib/types/dashboard";

/**
 * Lógica pura por trás do filtro "matriz → filiais" da UI do dashboard
 * (`EmpresaFilialFilter`). Mantida separada do componente React para
 * ser testável sem precisar de DOM/jsdom.
 */

/** Lista de UFs presentes nas filiais, ordenada e sem duplicatas. */
export function listarUFs(filiais: FilialFiltroDTO[]): string[] {
  return Array.from(new Set(filiais.map((f) => f.uf))).sort((a, b) => a.localeCompare(b));
}

/** Filiais visíveis após aplicar o filtro de UF ("" = todas as UFs). */
export function filtrarFiliaisPorUF(filiais: FilialFiltroDTO[], uf: string): FilialFiltroDTO[] {
  if (!uf) return filiais;
  return filiais.filter((f) => f.uf === uf);
}

/**
 * true quando todo o conjunto de filiais da matriz está selecionado —
 * usado para sincronizar o estado do checkbox "Todas", que reflete o
 * total da matriz e não apenas o subconjunto visível no filtro de UF.
 */
export function todasSelecionadas(filiais: FilialFiltroDTO[], selecionadas: string[]): boolean {
  if (filiais.length === 0) return false;
  const selecionadasSet = new Set(selecionadas);
  return filiais.every((f) => selecionadasSet.has(f.id));
}

/** Alterna uma filial específica dentro da lista de selecionadas. */
export function alternarFilial(selecionadas: string[], filialId: string): string[] {
  if (selecionadas.includes(filialId)) {
    return selecionadas.filter((id) => id !== filialId);
  }
  return [...selecionadas, filialId];
}

/**
 * Marca ou desmarca todas as filiais da matriz de uma vez
 * (independente do filtro de UF ativo no momento).
 */
export function alternarTodasFiliais(
  filiais: FilialFiltroDTO[],
  marcarTodas: boolean
): string[] {
  return marcarTodas ? filiais.map((f) => f.id) : [];
}

/**
 * Ids a marcar como selecionados quando o usuário escolhe uma empresa
 * no seletor "Empresa / matriz":
 * - "" (opção "Todas as empresas") → nenhum id específico; a consulta
 *   passa a usar todo o conjunto que o usuário tem permissão de ver.
 * - matriz com filiais → a própria matriz + todas as suas filiais
 *   (equivalente a abrir o painel já com "Todas" marcado).
 * - empresa independente, sem filiais (matriz "vazia") → só ela mesma,
 *   senão a consulta cairia de volta para todo o conjunto permitido em
 *   vez de ficar restrita à empresa escolhida.
 */
export function idsParaSelecionarAoEscolherMatriz(
  grupos: EmpresaGrupoDTO[],
  matrizId: string
): string[] {
  if (!matrizId) return [];
  const grupo = grupos.find((g) => g.id === matrizId);
  if (!grupo) return [matrizId];
  return [grupo.id, ...grupo.filiais.map((f) => f.id)];
}
