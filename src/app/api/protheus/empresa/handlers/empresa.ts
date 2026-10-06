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

async function carregarProtheus(ctx: CarregarProtheusCtx) {
  const client = await getProtheusClient(ctx.empresaId);
  const [empresaBruta, filiaisProtheus] = await Promise.all([
    client.fetchEmpresa(ctx.customPath).catch(() => null),
    client.fetchFiliais(ctx.customPath).catch(() => []),
  ]);
  const filiais = filiaisProtheus.length > 0 ? filiaisProtheus : ctx.filiaisPadrao;
  const empresaProtheus: EmpresaProtheusView = empresaBruta
    ? {
        ...empresaBruta,
        clienteId: ctx.tokenInfo?.clienteId,
        usuarioLogado: ctx.tokenInfo?.usuario,
        ambiente: ctx.tokenInfo?.ambiente,
      }
    : empresaFromTokenInfo(ctx.tokenInfo);
  return { empresaProtheus, filiais };
}

export async function buildEmpresaView(empresaId: string, customPath?: string): Promise<EmpresaView> {
  const empresaAtual = await findEmpresaAtual(empresaId);
  if (!empresaAtual) {
    return { empresaAtual: null, tokenInfo: null, filiaisPadrao: [], empresaProtheus: null, filiais: [], protheusError: null };
  }

  const tokenInfo = await resolveTokenInfo(empresaId);
  const filiaisPadrao = buildFiliaisPadrao(empresaAtual, tokenInfo);

  try {
    const { empresaProtheus, filiais } = await carregarProtheus({ empresaId, customPath, tokenInfo, filiaisPadrao });
    const protheusError = tokenInfo && !tokenInfo.ativo
      ? `Token Protheus expirado (${tokenInfo.expiraEm}). Atualize o PROTHEUS_REST_ACCESS_TOKEN no arquivo .env`
      : null;
    logIntegration("Consulta de dados da empresa no Protheus realizada com sucesso", {
      empresaId,
      temDados: Boolean(empresaProtheus),
      totalFiliais: filiais.length,
    });
    return { empresaAtual, tokenInfo, filiaisPadrao, empresaProtheus, filiais, protheusError };
  } catch (protheusError) {
    const msg = protheusError instanceof Error ? protheusError.message : "Erro ao conectar com Protheus";
    logApiError("Falha na consulta REST de tabela no Protheus", protheusError);
    return {
      empresaAtual,
      tokenInfo,
      filiaisPadrao,
      empresaProtheus: empresaFromTokenInfo(tokenInfo),
      filiais: filiaisPadrao,
      protheusError: msg,
    };
  }
}

export async function updateEmpresa(empresaId: string, body: { nome?: string; cnpj?: string }) {
  const atualizada = await updateEmpresaDados(empresaId, body);
  logIntegration("Dados da empresa sincronizados a partir do Protheus", {
    empresaId,
    nome: atualizada.nome,
  });
  return atualizada;
}
