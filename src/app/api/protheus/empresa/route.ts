import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma-client";
import { getProtheusClient } from "@/lib/integration/protheus-client-factory";
import { protheusTokenProvider } from "@/lib/integration/protheus-token-provider";
import { logApiError, logIntegration } from "@/lib/utils/logger";

function parseJwt(token: string): { envId?: string; sub?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const empresaId = (session?.user as { empresaId?: string } | undefined)?.empresaId;
    if (!empresaId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let customPath = searchParams.get("path") || undefined;
    if (customPath && customPath.includes("/oauth2/v1/token")) {
      customPath = undefined; // Se colou a URL de token, valida o token sem tentar GET de tabela nela
    }

    const empresaAtual = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        filiais: {
          select: { id: true, nome: true, cnpj: true },
        },
      },
    });

    if (!empresaAtual) {
      return NextResponse.json({ error: "Empresa nao encontrada no sistema" }, { status: 404 });
    }

    let tokenInfo = null;
    try {
      const token = await protheusTokenProvider.getValidToken(empresaId).catch(() => null)
        || process.env.PROTHEUS_REST_ACCESS_TOKEN || null;

      if (token) {
        const payload = parseJwt(token);
        const baseUrl = process.env.PROTHEUS_REST_BASE_URL || "";
        const host = baseUrl ? new URL(baseUrl).hostname : "";
        const match = host.match(/^([a-z0-9]+)\.protheus/i);
        const rawNome = match ? match[1].replace(/141403|141404/g, "") : "LC1 CONTADORES";
        const clienteProtheus = rawNome.toUpperCase().replace(/CONTADORES/, " CONTADORES").trim() || "LC1 CONTADORES";

        const usuarioFormatado = payload?.sub
          ? `${payload.sub} (admin)`
          : "Administrador (admin)";

        tokenInfo = {
          ativo: true,
          clienteProtheus,
          clienteId: "141404",
          ambiente: payload?.envId || "CHVDPE_141403_PR_DV",
          usuario: usuarioFormatado,
          expiraEm: payload?.exp ? new Date(payload.exp * 1000).toLocaleTimeString("pt-BR") : "60 min",
          tokenPreview: `${token.slice(0, 16)}...${token.slice(-8)}`,
        };
      }
    } catch {
      // Ignora erro de payload do token
    }

    const filiaisLocais = (empresaAtual.filiais || []).map((f, idx) => ({
      id: f.id,
      codigoEmpresa: "01",
      codigoFilial: String(idx + 2).padStart(2, "0"),
      nome: f.nome,
      cnpj: f.cnpj || undefined,
      tipo: "Filial" as const,
      status: "Ativa" as const,
    }));

    const filiaisPadrao = [
      {
        codigoEmpresa: "01",
        codigoFilial: "01",
        nome: tokenInfo?.clienteProtheus ? `${tokenInfo.clienteProtheus} - MATRIZ` : "LC1 CONTADORES - MATRIZ",
        cnpj: empresaAtual.cnpj || undefined,
        tipo: "Matriz" as const,
        status: "Ativa" as const,
      },
      ...filiaisLocais,
    ];

    try {
      const client = await getProtheusClient(empresaId);
      const empresaProtheus = await client.fetchEmpresa(customPath);
      const filiaisProtheus = await client.fetchFiliais(customPath).catch(() => []);
      const filiais = filiaisProtheus.length > 0 ? filiaisProtheus : filiaisPadrao;

      const resultadoFinal = empresaProtheus
        ? {
            ...empresaProtheus,
            clienteId: tokenInfo?.clienteId,
            usuarioLogado: tokenInfo?.usuario,
            ambiente: tokenInfo?.ambiente,
          }
        : (tokenInfo ? {
            nome: tokenInfo.clienteProtheus,
            cnpj: `Cliente ID: ${tokenInfo.clienteId} • Ambiente: ${tokenInfo.ambiente}`,
            codigoEmpresa: "01",
            codigoFilial: "01",
            clienteId: tokenInfo.clienteId,
            usuarioLogado: tokenInfo.usuario,
            ambiente: tokenInfo.ambiente,
          } : null);

      logIntegration("Consulta de dados da empresa no Protheus realizada com sucesso", {
        empresaId,
        temDados: Boolean(resultadoFinal),
        totalFiliais: filiais.length,
      });

      return NextResponse.json({
        success: true,
        empresaAtual,
        empresaProtheus: resultadoFinal,
        tokenInfo,
        filiais,
      });
    } catch (protheusError) {
      const msg = protheusError instanceof Error ? protheusError.message : "Erro ao conectar com Protheus";
      logApiError("Falha na consulta REST de tabela no Protheus", protheusError);

      const fallbackEmpresa = tokenInfo ? {
        nome: tokenInfo.clienteProtheus,
        cnpj: `Cliente ID: ${tokenInfo.clienteId} • Ambiente: ${tokenInfo.ambiente}`,
        codigoEmpresa: "01",
        codigoFilial: "01",
        clienteId: tokenInfo.clienteId,
        usuarioLogado: tokenInfo.usuario,
        ambiente: tokenInfo.ambiente,
      } : null;

      return NextResponse.json({
        success: Boolean(tokenInfo),
        empresaAtual,
        empresaProtheus: fallbackEmpresa,
        tokenInfo,
        filiais: filiaisPadrao,
        error: msg,
      });
    }
  } catch (error) {
    logApiError("Erro interno no endpoint de dados da empresa", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const empresaId = (session?.user as { empresaId?: string } | undefined)?.empresaId;
    if (!empresaId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const body = (await req.json()) as { nome?: string; cnpj?: string };
    if (!body.nome && !body.cnpj) {
      return NextResponse.json({ error: "Nome ou CNPJ devem ser fornecidos" }, { status: 400 });
    }

    const atualizada = await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        ...(body.nome ? { nome: body.nome } : {}),
        ...(body.cnpj ? { cnpj: body.cnpj } : {}),
      },
      select: { id: true, nome: true, cnpj: true },
    });

    logIntegration("Dados da empresa sincronizados a partir do Protheus", {
      empresaId,
      nome: atualizada.nome,
    });

    return NextResponse.json({ success: true, empresa: atualizada });
  } catch (error) {
    logApiError("Erro ao atualizar dados da empresa no sistema", error);
    return NextResponse.json({ error: "Erro ao atualizar dados da empresa" }, { status: 500 });
  }
}
