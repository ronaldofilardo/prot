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
import { resolveUsuarioProtheus } from "../_internals/usuario-protheus";
import { vincularFiliaisAsEmpresas } from "../_internals/vincular-filiais";
import type { FiliaisInfo } from "@/hooks/empresa-protheus-types";

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
  filiaisInfo: FiliaisInfo | null;
  protheusError: string | null;
}

interface CarregarProtheusCtx {
  empresaId: string;
  customPath?: string;
  tokenInfo: TokenInfo | null;
  filiaisPadrao: FilialView[];
}

async function consultarFiliaisUsuario(
  client: Awaited<ReturnType<typeof getProtheusClient>>,
  usuario: string | null
): Promise<{ filiais: ProtheusFilialInfo[]; restricaoAplicada: boolean; aviso?: string }> {
  try {
    if (client.fetchFiliaisUsuario) {
      const r = await client.fetchFiliaisUsuario(usuario);
      return { filiais: r.filiais, restricaoAplicada: r.restricaoAplicada, aviso: r.aviso };
    }
    // Transporte sem suporte (ex.: SOAP): usa o cadastro de filiais simples.
    const filiais = await client.fetchFiliais();
    return { filiais, restricaoAplicada: false, aviso: "Este transporte não permite restringir as filiais pelo usuário." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return { filiais: [], restricaoAplicada: false, aviso: `Não foi possível consultar as filiais no Protheus: ${msg}` };
  }
}

function resolveEmpresaView(
  empresaBruta: ProtheusEmpresaInfo | null,
  tokenInfo: TokenInfo | null
): EmpresaProtheusView {
  if (empresaBruta) {
    return { ...empresaBruta, clienteId: tokenInfo?.clienteId, usuarioLogado: tokenInfo?.usuario, ambiente: tokenInfo?.ambiente };
  }
  return empresaFromTokenInfo(tokenInfo);
}

async function carregarProtheus(ctx: CarregarProtheusCtx) {
  const client = await getProtheusClient(ctx.empresaId);
  const usuario = await resolveUsuarioProtheus(ctx.empresaId);
  const [empresaBruta, consulta] = await Promise.all([
    client.fetchEmpresa(ctx.customPath).catch(() => null),
    consultarFiliaisUsuario(client, usuario),
  ]);

  let filiais: Array<ProtheusFilialInfo | FilialView> = ctx.filiaisPadrao;
  let matrizId: string | null = null;
  if (consulta.filiais.length > 0) {
    // So cria Empresas quando a lista foi de fato limitada ao usuario.
    const vinculo = await vincularFiliaisAsEmpresas(ctx.empresaId, consulta.filiais, consulta.restricaoAplicada);
    filiais = vinculo.filiais;
    matrizId = vinculo.matrizId;
  }

  const filiaisInfo: FiliaisInfo = {
    usuario,
    restricaoAplicada: consulta.restricaoAplicada,
    aviso: consulta.aviso,
    matrizId,
  };
  const empresaProtheus = resolveEmpresaView(empresaBruta, ctx.tokenInfo);
  return { empresaProtheus, filiais, filiaisInfo };
}

function buildErrorResponse(empresaAtual: EmpresaAtual, tokenInfo: TokenInfo | null, filiaisPadrao: FilialView[], protheusError: string) {
  return {
    empresaAtual,
    tokenInfo,
    filiaisPadrao,
    empresaProtheus: empresaFromTokenInfo(tokenInfo),
    filiais: filiaisPadrao,
    filiaisInfo: null,
    protheusError,
  };
}

function buildSuccessResponse(empresaAtual: EmpresaAtual, tokenInfo: TokenInfo | null, filiaisPadrao: FilialView[], empresaProtheus: EmpresaProtheusView, filiais: Array<ProtheusFilialInfo | FilialView>, filiaisInfo: FiliaisInfo | null) {
  return { empresaAtual, tokenInfo, filiaisPadrao, empresaProtheus, filiais, filiaisInfo, protheusError: null };
}

async function carregarEProcessarProtheus(empresaId: string, customPath: string | undefined, tokenInfo: TokenInfo | null, filiaisPadrao: FilialView[]) {
  const { empresaProtheus, filiais, filiaisInfo } = await carregarProtheus({ empresaId, customPath, tokenInfo, filiaisPadrao });
  const refreshedToken = await resolveTokenInfo(empresaId);
  const protheusError = refreshedToken && !refreshedToken.ativo
    ? `Token Protheus expirado (${refreshedToken.expiraEm}). Atualize o PROTHEUS_REST_ACCESS_TOKEN no arquivo .env`
    : null;
  logIntegration("Consulta de dados da empresa no Protheus realizada com sucesso", {
    empresaId,
    temDados: Boolean(empresaProtheus),
    totalFiliais: filiais.length,
  });
  return { empresaProtheus, filiais, filiaisInfo, protheusError, tokenInfo: refreshedToken };
}

export async function buildEmpresaView(empresaId: string, customPath?: string): Promise<EmpresaView> {
  const empresaAtual = await findEmpresaAtual(empresaId);
  if (!empresaAtual) {
    return { empresaAtual: null, tokenInfo: null, filiaisPadrao: [], empresaProtheus: null, filiais: [], filiaisInfo: null, protheusError: null };
  }

  const tokenInfo = await resolveTokenInfo(empresaId);
  const filiaisPadrao = buildFiliaisPadrao(empresaAtual, tokenInfo);

  try {
    const { empresaProtheus, filiais, filiaisInfo, protheusError, tokenInfo: refreshedToken } = await carregarEProcessarProtheus(empresaId, customPath, tokenInfo, filiaisPadrao);
    return buildSuccessResponse(empresaAtual, refreshedToken, filiaisPadrao, empresaProtheus, filiais, filiaisInfo);
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