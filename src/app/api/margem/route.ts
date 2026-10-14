import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logApiError } from "@/lib/utils/logger";
import { buildMargemReport } from "./handlers/margem";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { usuarioId?: string; empresaId?: string } | undefined;
    const empresaId = sessionUser?.empresaId;
    const usuarioId = sessionUser?.usuarioId;

    if (!empresaId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      dataInicio: searchParams.get("dataInicio") || undefined,
      dataFim: searchParams.get("dataFim") || undefined,
      filial: searchParams.get("filial") || undefined,
      clienteId: searchParams.get("clienteId") || undefined,
      empresaIds: searchParams.getAll("empresaId"),
    };

    const response = await buildMargemReport(empresaId, usuarioId, filters);
    return NextResponse.json(response);
  } catch (error) {
    logApiError("Erro ao calcular margem de vendas", error);
    return NextResponse.json({ error: "Erro interno ao calcular margem" }, { status: 500 });
  }
}
