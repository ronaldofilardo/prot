import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logApiError } from "@/lib/utils/logger";
import { buildEmpresaView, updateEmpresa } from "./handlers/empresa";

async function getSessionEmpresaId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { empresaId?: string } | undefined)?.empresaId ?? null;
}

function resolveCustomPath(req: Request): string | undefined {
  const { searchParams } = new URL(req.url);
  const customPath = searchParams.get("path") || undefined;
  if (customPath && customPath.includes("/oauth2/v1/token")) {
    return undefined;
  }
  return customPath;
}

export async function GET(req: Request) {
  try {
    const empresaId = await getSessionEmpresaId();
    if (!empresaId) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

    const view = await buildEmpresaView(empresaId, resolveCustomPath(req));
    if (!view.empresaAtual) return NextResponse.json({ error: "Empresa nao encontrada no sistema" }, { status: 404 });

    if (view.protheusError !== null) {
      return NextResponse.json({
        success: Boolean(view.tokenInfo),
        empresaAtual: view.empresaAtual,
        empresaProtheus: view.empresaProtheus,
        tokenInfo: view.tokenInfo,
        filiais: view.filiaisPadrao,
        error: view.protheusError,
      });
    }
    return NextResponse.json({
      success: true,
      empresaAtual: view.empresaAtual,
      empresaProtheus: view.empresaProtheus,
      tokenInfo: view.tokenInfo,
      filiais: view.filiais,
    });
  } catch (error) {
    logApiError("Erro interno no endpoint de dados da empresa", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const empresaId = await getSessionEmpresaId();
    if (!empresaId) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

    const body = (await req.json()) as { nome?: string; cnpj?: string };
    if (!body.nome && !body.cnpj) return NextResponse.json({ error: "Nome ou CNPJ devem ser fornecidos" }, { status: 400 });

    const atualizada = await updateEmpresa(empresaId, body);
    return NextResponse.json({ success: true, empresa: atualizada });
  } catch (error) {
    logApiError("Erro ao atualizar dados da empresa no sistema", error);
    return NextResponse.json({ error: "Erro ao atualizar dados da empresa" }, { status: 500 });
  }
}
