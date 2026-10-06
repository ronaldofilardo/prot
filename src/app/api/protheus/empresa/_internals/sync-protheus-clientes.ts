import { prisma } from "@/lib/db/prisma-client";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";
import { logIntegration, logApiError } from "@/lib/utils/logger";

const MOCK_CLIENTE_NAMES = [
  "EMPRESA ALPHA LTDA",
  "BETA INDUSTRIA SA",
  "GAMMA COMERCIO LTDA",
  "DELTA SERVICOS ME",
  "OMEGA LOGISTICA LTDA",
  "SIGMA TECNOLOGIA SA",
  "LAMBDA ALIMENTOS LTDA",
  "PHI CONSTRUCOES ME",
  "CLIENTE TESTE INATIVO",
  "CHI QUIMICA LTDA",
];

const MOCK_CODIGOS = ["1", "2", "3", "4", "5", "6", "7", "8", "10", "20", "21"];

function buildDesativarWhere(empresaId: string) {
  return {
    where: {
      empresaId,
      OR: [
        { nome: { in: MOCK_CLIENTE_NAMES } },
        { codigo: { in: MOCK_CODIGOS } },
        { loja: "undefined" },
        { nome: "CLIENTE TESTE LC1" },
      ],
    },
    data: { ativo: false },
  };
}

async function upsertClienteProtheus(empresaId: string, f: ProtheusFilialInfo): Promise<void> {
  const codigo = (f.id || f.codigoFilial || "000000").trim();
  const nome = (f.nome || "").trim();
  if (!nome) return;

  await prisma.cliente.upsert({
    where: { codigo_loja_empresaId: { codigo, loja: "01", empresaId } },
    update: { nome, cidade: f.cnpj || "", ativo: f.status !== "Inativa" },
    create: { codigo, loja: "01", nome, cidade: f.cnpj || "", estado: f.uf || "PR", ativo: f.status !== "Inativa", empresaId },
  });
}

export async function sincronizarClientesProtheusNoBanco(
  empresaId: string,
  filiais: ProtheusFilialInfo[],
): Promise<void> {
  if (!empresaId || filiais.length === 0 || !prisma?.cliente?.upsert) return;

  try {
    await prisma.cliente.updateMany(buildDesativarWhere(empresaId)).catch(() => null);
    for (const f of filiais) await upsertClienteProtheus(empresaId, f);
    logIntegration("Clientes do Protheus sincronizados no banco com sucesso", { empresaId, total: filiais.length });
  } catch (error) {
    logApiError("Falha ao sincronizar clientes do Protheus no banco", error);
  }
}

function buildFindWhere(empresaId: string) {
  return {
    where: {
      empresaId,
      ativo: true,
      NOT: { OR: [{ nome: { in: MOCK_CLIENTE_NAMES } }, { nome: "CLIENTE TESTE LC1" }, { codigo: { in: MOCK_CODIGOS } }] },
    },
    orderBy: { nome: "asc" as const },
  };
}

function mapToFilial(c: { codigo: string; loja?: string; nome: string; cidade?: string; uf?: string }): ProtheusFilialInfo {
  return {
    id: c.codigo,
    codigoEmpresa: "001",
    codigoUnidade: "01",
    codigoFilial: c.loja || "01",
    filialCompleta: `00101${c.loja || "01"}`,
    nome: c.nome,
    cnpj: c.cidade || "",
    tipo: "Filial" as const,
    status: "Ativa" as const,
  };
}

export async function carregarClientesProtheusDoBanco(
  empresaId: string,
): Promise<ProtheusFilialInfo[]> {
  try {
    const clientes = await prisma.cliente.findMany(buildFindWhere(empresaId));
    return clientes.map(mapToFilial);
  } catch {
    return [];
  }
}