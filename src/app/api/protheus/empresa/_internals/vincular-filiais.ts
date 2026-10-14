import { prisma } from "@/lib/db/prisma-client";
import type { ProtheusFilialInfo } from "@/lib/integration/protheus-client";
import { logApiError, logIntegration } from "@/lib/utils/logger";

const soDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

interface EmpresaRow {
  id: string;
  cnpj: string | null;
  matrizId: string | null;
}

interface EmpresaRaiz {
  id: string;
  tenantId: string;
  matrizId: string | null;
}

export interface VinculoFiliais {
  filiais: ProtheusFilialInfo[];
  /** Empresa raiz (matriz) do grupo da empresa logada. */
  matrizId: string | null;
}

function buildCnpjIndex(empresas: EmpresaRow[]): Map<string, EmpresaRow> {
  const index = new Map<string, EmpresaRow>();
  for (const e of empresas) {
    const d = soDigitos(e.cnpj);
    if (d.length === 14 && !index.has(d)) index.set(d, e);
  }
  return index;
}

interface ResolvedEmpresa {
  empresa: EmpresaRow | null;
  criou: boolean;
}

async function resolveEmpresaFilial(
  filial: ProtheusFilialInfo,
  porCnpj: Map<string, EmpresaRow>,
  criar: boolean,
  tenantId: string,
  raizId: string
): Promise<ResolvedEmpresa> {
  const emp = porCnpj.get(soDigitos(filial.cnpj));
  if (emp) return { empresa: emp, criou: false };
  if (!criar) return { empresa: null, criou: false };
  try {
    const nova = await prisma.empresa.create({
      data: { nome: filial.nome, cnpj: filial.cnpj ?? null, tenantId, matrizId: raizId },
      select: { id: true, cnpj: true, matrizId: true },
    });
    porCnpj.set(soDigitos(filial.cnpj), nova);
    return { empresa: nova, criou: true };
  } catch (err) {
    logApiError("Falha ao criar Empresa para filial do Protheus", err);
    return { empresa: null, criou: false };
  }
}

function filialVinculada(
  f: ProtheusFilialInfo,
  emp: EmpresaRow | null,
  raizId: string
): ProtheusFilialInfo {
  const noGrupo = emp && (emp.id === raizId || emp.matrizId === raizId);
  return noGrupo && emp ? { ...f, empresaVinculadaId: emp.id } : f;
}

async function fetchEmpresaRaiz(empresaId: string): Promise<EmpresaRaiz | null> {
  return prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { id: true, tenantId: true, matrizId: true },
  });
}

interface FiliaisProcessadas {
  resultado: ProtheusFilialInfo[];
  criadas: number;
}

async function processarFiliais(
  filiais: ProtheusFilialInfo[],
  porCnpj: Map<string, EmpresaRow>,
  criar: boolean,
  tenantId: string,
  raizId: string
): Promise<FiliaisProcessadas> {
  const resultado: ProtheusFilialInfo[] = [];
  let criadas = 0;
  for (const f of filiais) {
    const cnpj = soDigitos(f.cnpj);
    if (cnpj.length !== 14) {
      resultado.push(f);
      continue;
    }
    const { empresa, criou } = await resolveEmpresaFilial(f, porCnpj, criar, tenantId, raizId);
    if (criou) criadas++;
    resultado.push(filialVinculada(f, empresa, raizId));
  }
  return { resultado, criadas };
}

/**
 * Vincula as filiais do Protheus (por CNPJ) as Empresas do SaaS do mesmo
 * Tenant, na estrutura matriz/filial (Empresa.matrizId) usada pelo dashboard.
 *
 * - Sempre faz o vinculo de leitura (preenche `empresaVinculadaId`).
 * - So CRIA Empresas novas quando `criar` = true (lista restrita ao usuario).
 * - Nunca altera a hierarquia de empresas que ja pertencem a outro grupo.
 */
export async function vincularFiliaisAsEmpresas(
  empresaId: string,
  filiais: ProtheusFilialInfo[],
  criar: boolean
): Promise<VinculoFiliais> {
  try {
    const atual = await fetchEmpresaRaiz(empresaId);
    if (!atual) return { filiais, matrizId: null };

    const raizId = atual.matrizId ?? atual.id;
    const existentes: EmpresaRow[] = await prisma.empresa.findMany({
      where: { tenantId: atual.tenantId },
      select: { id: true, cnpj: true, matrizId: true },
    });
    const { resultado, criadas } = await processarFiliais(
      filiais, buildCnpjIndex(existentes), criar, atual.tenantId, raizId
    );

    if (criadas > 0) logIntegration("Filiais do Protheus vinculadas como Empresas", { empresaId, criadas });
    return { filiais: resultado, matrizId: raizId };
  } catch (err) {
    logApiError("Falha ao vincular filiais do Protheus as Empresas", err);
    return { filiais, matrizId: null };
  }
}
