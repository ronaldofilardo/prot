/**
 * Endpoint de upload — recebe CSVs do Protheus via formulário web.
 *
 * Fluxo: CSV upload → parse → detecção de entidade → adapter canônico → sync engine
 * Não requer API key (é uso interno do SaaS), mas valida autenticação de sessão.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logApiError } from "@/lib/utils/logger";
import { processarUpload } from "./handlers/upload";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const empresaId = (session?.user as { empresaId?: string } | undefined)?.empresaId;
    if (!empresaId) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

    const resultados = await processarUpload(empresaId, files);
    return NextResponse.json({ success: true, resultados });
  } catch (error) {
    logApiError("Erro no upload de CSV", error);
    return NextResponse.json({ error: "Erro interno no upload" }, { status: 500 });
  }
}
