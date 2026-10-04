import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logApiError } from "@/lib/utils/logger";
import type { DashboardFilters } from "@/lib/types/dashboard";
import { buildDashboardReport } from "./handlers/dashboard";

function parseFilters(request: Request): DashboardFilters {
  const { searchParams } = new URL(request.url);
  return {
    cliente: searchParams.get("cliente") || "",
    dataInicial: searchParams.get("inicial") || "",
    dataFinal: searchParams.get("final") || "",
    matrizId: searchParams.get("matriz") || null,
    empresaIds: searchParams.getAll("empresaId"),
  };
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { usuarioId?: string; empresaId?: string } | undefined;
    const empresaId = sessionUser?.empresaId;
    const usuarioId = sessionUser?.usuarioId;
    if (!empresaId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const response = await buildDashboardReport({
      empresaId,
      usuarioId,
      filters: parseFilters(request),
    });
    return NextResponse.json(response);
  } catch (error) {
    logApiError("Erro ao buscar dados do dashboard", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
