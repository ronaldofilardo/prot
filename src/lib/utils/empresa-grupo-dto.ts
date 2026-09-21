import type { EmpresaGrupoDTO } from "@/lib/types/dashboard";

/**
 * Formato mínimo de uma linha de `Empresa` (com filiais incluídas via
 * Prisma `include: { filiais: true }`) necessário para montar o DTO do
 * filtro de empresa/grupo. Mantido desacoplado do tipo gerado pelo
 * Prisma Client para este módulo continuar puro e fácil de testar.
 */
export interface EmpresaComFiliaisRow {
  id: string;
  nome: string;
  cnpj: string | null;
  matrizId: string | null;
  filiais: Array<{
    id: string;
    nome: string;
    cnpj: string | null;
  }>;
}

/**
 * Extrai, de uma filial (que na origem Protheus só carrega `filial`
 * como código solto em Faturamento/ContaReceber/Baixa), a cidade/UF
 * a exibir no filtro. Quando a filial ainda não tem essa informação
 * cadastrada, cai para valores neutros em vez de quebrar a UI.
 */
export interface CidadeUF {
  cidade: string;
  uf: string;
}

/**
 * Monta os grupos (matriz + filiais) exibidos no filtro do dashboard.
 *
 * Recebe as `Empresa` do tenant já carregadas com suas filiais diretas
 * (`matrizId != null`) e o mapa de cidade/UF de cada filial (hoje esse
 * dado não está na tabela `Empresa`, então é resolvido à parte — ex.:
 * a partir do registro mais recente de `Faturamento.filial` da filial,
 * ou de um cadastro futuro). Empresas sem matriz (`matrizId === null`)
 * são a cabeça de cada grupo; empresas que já são filiais de outra
 * (aparecem em `filiais`) não geram um grupo próprio.
 */
export function buildGruposEmpresa(
  empresas: EmpresaComFiliaisRow[],
  cidadeUfPorFilialId: Record<string, CidadeUF> = {}
): EmpresaGrupoDTO[] {
  return empresas
    .filter((empresa) => empresa.matrizId === null)
    .map((matriz) => ({
      id: matriz.id,
      nome: matriz.nome,
      cnpj: matriz.cnpj,
      filiais: matriz.filiais.map((filial) => ({
        id: filial.id,
        nome: filial.nome,
        cidade: cidadeUfPorFilialId[filial.id]?.cidade ?? "",
        uf: cidadeUfPorFilialId[filial.id]?.uf ?? "",
      })),
    }));
}
