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

export async function sincronizarClientesProtheusNoBanco(
  empresaId: string,
  filiais: ProtheusFilialInfo[],
): Promise<void> {
  if (!empresaId || filiais.length === 0 || !prisma?.cliente?.upsert) return;

  try {
    // Desativa registros mock das planilhas para evitar colisão e duplicidade
    await prisma.cliente.updateMany({
      where: {
        empresaId,
        OR: [
          { nome: { in: MOCK_CLIENTE_NAMES } },
          { codigo: { in: ["1", "2", "3", "4", "5", "6", "7", "8", "10", "20", "21"] } },
          { loja: "undefined" },
          { nome: "CLIENTE TESTE LC1" },
        ],
      },
      data: { ativo: false },
    }).catch(() => null);

    // Upsert dos clientes reais da carteira do Protheus
    for (const f of filiais) {
      const codigo = (f.id || f.codigoFilial || "000000").trim();
      const nome = (f.nome || "").trim();
      if (!nome) continue;

      await prisma.cliente.upsert({
        where: {
          codigo_loja_empresaId: {
            codigo,
            loja: "01",
            empresaId,
          },
        },
        update: {
          nome,
          cidade: f.cnpj || "",
          ativo: f.status !== "Inativa",
        },
        create: {
          codigo,
          loja: "01",
          nome,
          cidade: f.cnpj || "",
          estado: f.uf || "PR",
          ativo: f.status !== "Inativa",
          empresaId,
        },
      });
    }

    logIntegration("Clientes do Protheus sincronizados no banco com sucesso", {
      empresaId,
      total: filiais.length,
    });
  } catch (error) {
    logApiError("Falha ao sincronizar clientes do Protheus no banco", error);
  }
}
