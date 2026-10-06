import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logApiError } from "@/lib/utils/logger";
import { getCredenciaisStatus, salvarCredenciaisProtheus } from "./handlers/credenciais";

async function getSessionEmpresaId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { empresaId?: string } | undefined)?.empresaId ?? null;
}

export async function GET() {
  try {
    const empresaId = await getSessionEmpresaId();
    if (!empresaId) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

    const status = await getCredenciaisStatus(empresaId);
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    logApiError("Erro na rota GET /api/protheus/credenciais", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const empresaId = await getSessionEmpresaId();
    if (!empresaId) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

    const body = await req.json();
    const result = await salvarCredenciaisProtheus(empresaId, body);
    return NextResponse.json({
      message: "Credenciais salvas e token Protheus renovado com sucesso!",
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao salvar credenciais Protheus";
    logApiError("Erro na rota POST /api/protheus/credenciais", error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
