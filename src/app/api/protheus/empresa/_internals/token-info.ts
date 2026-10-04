import { protheusTokenProvider } from "@/lib/integration/protheus-token-provider";

export interface TokenInfo {
  ativo: boolean;
  clienteProtheus: string;
  clienteId: string;
  ambiente: string;
  usuario: string;
  expiraEm: string;
  tokenPreview: string;
}

export interface EmpresaFallback {
  nome: string;
  cnpj: string;
  codigoEmpresa: string;
  codigoFilial: string;
  clienteId: string;
  usuarioLogado: string;
  ambiente: string;
}

function parseJwt(token: string): { envId?: string; sub?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function deriveClienteProtheus(baseUrl: string): string {
  const host = baseUrl ? new URL(baseUrl).hostname : "";
  const match = host.match(/^([a-z0-9]+)\.protheus/i);
  const rawNome = match ? match[1].replace(/141403|141404/g, "") : "LC1 CONTADORES";
  return rawNome.toUpperCase().replace(/CONTADORES/, " CONTADORES").trim() || "LC1 CONTADORES";
}

function buildTokenInfo(token: string): TokenInfo {
  const payload = parseJwt(token);
  const clienteProtheus = deriveClienteProtheus(process.env.PROTHEUS_REST_BASE_URL || "");

  return {
    ativo: true,
    clienteProtheus,
    clienteId: "141404",
    ambiente: payload?.envId || "CHVDPE_141403_PR_DV",
    usuario: payload?.sub ? `${payload.sub} (admin)` : "Administrador (admin)",
    expiraEm: payload?.exp ? new Date(payload.exp * 1000).toLocaleTimeString("pt-BR") : "60 min",
    tokenPreview: `${token.slice(0, 16)}...${token.slice(-8)}`,
  };
}

export async function resolveTokenInfo(empresaId: string): Promise<TokenInfo | null> {
  try {
    const token = await protheusTokenProvider.getValidToken(empresaId).catch(() => null)
      || process.env.PROTHEUS_REST_ACCESS_TOKEN || null;
    if (!token) return null;
    return buildTokenInfo(token);
  } catch {
    return null;
  }
}

export function empresaFromTokenInfo(tokenInfo: TokenInfo | null): EmpresaFallback | null {
  if (!tokenInfo) return null;
  return {
    nome: tokenInfo.clienteProtheus,
    cnpj: `Cliente ID: ${tokenInfo.clienteId} • Ambiente: ${tokenInfo.ambiente}`,
    codigoEmpresa: "01",
    codigoFilial: "01",
    clienteId: tokenInfo.clienteId,
    usuarioLogado: tokenInfo.usuario,
    ambiente: tokenInfo.ambiente,
  };
}
