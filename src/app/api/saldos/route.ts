import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logApiError } from "@/lib/utils/logger";
import { buildSaldosReport } from "./handlers/saldos";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { usuarioId?: string; empresaId?: string } | undefined;
    const empresaId = sessionUser?.empresaId;
    const usuarioId = sessionUser?.usuarioId;
    
    if (!empresaId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const filters = {
      exercicio: searchParams.get("exercicio") || new Date().getFullYear().toString(),
      filial: searchParams.get("filial") || "",
      empresaIds: searchParams.getAll("empresaId"),
    };

    const response = await buildSaldosReport({
      empresaId,
      usuarioId,
      filters,
    });
    return NextResponse.json(response);
  } catch (error) {
    logApiError("Erro ao buscar saldos contabeis", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
