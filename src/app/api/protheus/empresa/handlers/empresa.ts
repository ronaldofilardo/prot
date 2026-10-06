import type { ProtheusEmpresaInfo, ProtheusFilialInfo } from "@/lib/integration/protheus-client";
import { getProtheusClient } from "@/lib/integration/protheus-client-factory";
import { logApiError, logIntegration } from "@/lib/utils/logger";
import { findEmpresaAtual, updateEmpresaDados, type EmpresaAtual } from "../_internals/empresa-query";
import { buildFiliaisPadrao, type FilialView } from "../_internals/filiais";
import {
  empresaFromTokenInfo,
  resolveTokenInfo,
  type EmpresaFallback,
  type TokenInfo,
} from "../_internals/token-info";
import {
  sincronizarClientesProtheusNoBanco,
  carregarClientesProtheusDoBanco,
} from "../_internals/sync-protheus-clientes";

export type EmpresaProtheusView =
  | (ProtheusEmpresaInfo & { clienteId?: string; usuarioLogado?: string; ambiente?: string })
  | EmpresaFallback
  | null;

export interface EmpresaView {
  empresaAtual: EmpresaAtual | null;
  tokenInfo: TokenInfo | null;
  filiaisPadrao: FilialView[];
  empresaProtheus: EmpresaProtheusView;
  filiais: Array<ProtheusFilialInfo | FilialView>;
  protheusError: string | null;
}

interface CarregarProtheusCtx {
  empresaId: string;
  customPath?: string;
  tokenInfo: TokenInfo | null;
  filiaisPadrao: FilialView[];
}

async function resolveFiliais(
  empresaId: string,
  protheus: ProtheusFilialInfo[],
  padrao: FilialView[]
): Promise<Array<ProtheusFilialInfo | FilialView>> {
  const temReais = protheus.length > 1 || (protheus.length === 1 && !protheus[0].nome?.includes("MATRIZ"));
  if (temReais) {
    sincronizarClientesProtheusNoBanco(empresaId, protheus).catch(() => null);
    return protheus;
  }
  const doBanco = await carregarClientesProtheusDoBanco(empresaId);
  if (doBanco.length > 0) return doBanco;
  return protheus.length > 0 ? protheus : padrao;
}

function resolveEmpresaView(
  empresaBruta: ProtheusEmpresaInfo | null,
  filiais: Array<ProtheusFilialInfo | FilialView>,
  tokenInfo: TokenInfo | null
): EmpresaProtheusView {
  const isCliente = Boolean(empresaBruta && filiais.some((f) => f.nome === empresaBruta.nome));
  if (empresaBruta && !isCliente) {
    return { ...empresaBruta, clienteId: tokenInfo?.clienteId, usuarioLogado: tokenInfo?.usuario, ambiente: tokenInfo?.ambiente };
  }
  return empresaFromTokenInfo(tokenInfo);
}

async function carregarProtheus(ctx: CarregarProtheusCtx) {
  const client = await getProtheusClient(ctx.empresaId);
  const [empresaBruta, filiaisProtheus] = await Promise.all([
    client.fetchEmpresa(ctx.customPath).catch(() => null),
    client.fetchFiliais(ctx.customPath).catch(() => []),
  ]);
  const filiais = await resolveFiliais(ctx.empresaId, filiaisProtheus, ctx.filiaisPadrao);
  const empresaProtheus = resolveEmpresaView(empresaBruta, filiais, ctx.tokenInfo);
  return { empresaProtheus, filiais };
}

function buildErrorResponse(empresaAtual: EmpresaAtual, tokenInfo: TokenInfo | null, filiaisPadrao: FilialView[], protheusError: string) {
  return {
    empresaAtual,
    tokenInfo,
    filiaisPadrao,
    empresaProtheus: empresaFromTokenInfo(tokenInfo),
    filiais: filiaisPadrao,
    protheusError,
  };
}

function buildSuccessResponse(empresaAtual: EmpresaAtual, tokenInfo: TokenInfo | null, filiaisPadrao: FilialView[], empresaProtheus: EmpresaProtheusView, filiais: Array<ProtheusFilialInfo | FilialView>) {
  return { empresaAtual, tokenInfo, filiaisPadrao, empresaProtheus, filiais, protheusError: null };
}

async function carregarEProcessarProtheus(empresaId: string, customPath: string | undefined, tokenInfo: TokenInfo | null, filiaisPadrao: FilialView[]) {
  const { empresaProtheus, filiais } = await carregarProtheus({ empresaId, customPath, tokenInfo, filiaisPadrao });
  const refreshedToken = await resolveTokenInfo(empresaId);
  const protheusError = refreshedToken && !refreshedToken.ativo
    ? `Token Protheus expirado (${refreshedToken.expiraEm}). Atualize o PROTHEUS_REST_ACCESS_TOKEN no arquivo .env`
    : null;
  logIntegration("Consulta de dados da empresa no Protheus realizada com sucesso", {
    empresaId,
    temDados: Boolean(empresaProtheus),
    totalFiliais: filiais.length,
  });
  return { empresaProtheus, filiais, protheusError, tokenInfo: refreshedToken };
}

export async function buildEmpresaView(empresaId: string, customPath?: string): Promise<EmpresaView> {
  const empresaAtual = await findEmpresaAtual(empresaId);
  if (!empresaAtual) {
    return { empresaAtual: null, tokenInfo: null, filiaisPadrao: [], empresaProtheus: null, filiais: [], protheusError: null };
  }

  const tokenInfo = await resolveTokenInfo(empresaId);
  const filiaisPadrao = buildFiliaisPadrao(empresaAtual, tokenInfo);

  try {
    const { empresaProtheus, filiais, protheusError, tokenInfo: refreshedToken } = await carregarEProcessarProtheus(empresaId, customPath, tokenInfo, filiaisPadrao);
    return buildSuccessResponse(empresaAtual, refreshedToken, filiaisPadrao, empresaProtheus, filiais);
  } catch (_protheusError) {
    const msg = _protheusError instanceof Error ? _protheusError.message : "Erro ao conectar com Protheus";
    logApiError("Falha na consulta REST de tabela no Protheus", _protheusError);
    return buildErrorResponse(empresaAtual, tokenInfo, filiaisPadrao, msg);
  }
}

export async function updateEmpresa(empresaId: string, body: { nome?: string; cnpj?: string }) {
  const atualizada = await updateEmpresaDados(empresaId, body);
  logIntegration("Dados da empresa sincronizados a partir do Protheus", { empresaId, nome: atualizada.nome });
  return atualizada;
}