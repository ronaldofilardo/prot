/**
 * Endpoint acionado manualmente pelo botão "Atualizar do Protheus".
 *
 * Não há cron, scheduler ou webhook aqui de propósito: cada chamada é
 * disparada por uma ação explícita do usuário na UI. Somente leitura —
 * consome dados do Protheus (via REST ou SOAP, conforme
 * PROTHEUS_INTEGRATION_MODE) e nunca envia nada de volta.
 *
 * POST /api/protheus/pull
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pullAndSyncFromProtheus } from "@/lib/integration/pull-and-sync";
import { logApiError } from "@/lib/utils/logger";

export const maxDuration = 60;

export async function POST(req?: Request) {
  try {
    const session = await getServerSession(authOptions);
    const empresaId = (session?.user as { empresaId?: string } | undefined)?.empresaId;
    if (!empresaId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    let entidade: string | undefined;
    if (req) {
      try {
        const body = await req.json();
        if (body && typeof body.entidade === "string") {
          entidade = body.entidade;
        }
      } catch {
        // Sem body JSON válido, processa todas as entidades
      }
    }

    const resultados = await pullAndSyncFromProtheus(empresaId, entidade);
    const teveErro = resultados.some((r) => r.erro);

    return NextResponse.json({ success: !teveErro, resultados });
  } catch (error) {
    logApiError("Erro no endpoint de atualizacao manual do Protheus", error);
    return NextResponse.json({ error: "Erro interno ao atualizar do Protheus" }, { status: 500 });
  }
}
