import {
  ProtheusClientError,
  type ProtheusClient,
  type ProtheusEmpresaInfo,
  type ProtheusFilialInfo,
  type ProtheusRow,
} from "./protheus-client";
import { buildAuthHeader } from "./_internals/rest-auth";
import {
  buildFallbackClientesRows,
  buildFallbackContasReceberRows,
  buildFallbackFaturamentosRows,
  buildFallbackFilial,
} from "./_internals/rest-mock";
import {
  buildRequestUrl,
  mapEmpresaInfo,
  mapRowToFilial,
  readRows,
} from "./_internals/rest-parse";
import {
  BAIXAS_FALLBACK_PATHS,
  CLIENTES_FALLBACK_PATHS,
  CONTAS_RECEBER_FALLBACK_PATHS,
  EMPRESA_FALLBACK_PATHS,
  FATURAMENTOS_FALLBACK_PATHS,
  FILIAIS_FALLBACK_PATHS,
  buildCandidatePaths,
} from "./_internals/rest-paths";
import {
  executeFetch,
  fetchFirstNonEmptyOrThrow,
  fetchFirstNonEmptySwallowingErrors,
  fetchRowsFromFirstPath,
} from "./_internals/rest-retry";
import type { ProtheusRestConfig } from "./_internals/rest-types";

export type { ProtheusRestConfig } from "./_internals/rest-types";

/**
 * Cliente REST nativo do Protheus (modo primário de integração).
 *
 * Assume o padrão mais comum de exposição REST do Protheus (TOTVS REST /
 * framework FWMBrowse, "REST Community" ou API customizada em TLPP):
 * endpoints que retornam JSON com os campos crus da tabela (A1_COD,
 * A1_NOME, F2_DOC, etc), filtráveis por empresa/filial.
 *
 * Somente leitura: esta classe não expõe nenhum método de escrita.
 */

export class ProtheusRestClient implements ProtheusClient {
  constructor(private readonly config: ProtheusRestConfig) { }

  private async get(path: string | undefined, settingName: string): Promise<ProtheusRow[]> {
    if (!path) {
      throw new ProtheusClientError(`${settingName} nao configurado`);
    }
    const url = buildRequestUrl(path, this.config, settingName);
    let auth = await buildAuthHeader(this.config);
    let response = await executeFetch(url.toString(), auth, path);
    // Se retornar 401 e for oauth2, tenta renovar o token e repetir uma vez
    if (response.status === 401 && this.config.authMode === "oauth2") {
      auth = await buildAuthHeader(this.config, true);
      response = await executeFetch(url.toString(), auth, path);
    }
    return readRows(response, path);
  }

  // TODO: confirmar os paths reais dos endpoints REST habilitados no
  // Protheus de destino. Os paths abaixo são placeholders com o nome
  // convencional das tabelas usadas hoje via CSV (SA1/SF2/SE1/SE5).
  async fetchEmpresa(customPath?: string): Promise<ProtheusEmpresaInfo | null> {
    const candidatePaths = buildCandidatePaths(customPath, [
      this.config.paths.empresa,
      process.env.PROTHEUS_REST_EMPRESA_PATH,
      ...EMPRESA_FALLBACK_PATHS,
    ]);
    const rows = await fetchFirstNonEmptyOrThrow(
      candidatePaths,
      (path) => this.get(path, "PROTHEUS_REST_EMPRESA_PATH")
    );
    if (!rows) return null;
    return mapEmpresaInfo(rows, this.config);
  }

  async fetchFiliais(customPath?: string): Promise<ProtheusFilialInfo[]> {
    const candidatePaths = buildCandidatePaths(customPath, [
      process.env.PROTHEUS_REST_FILIAIS_PATH,
      ...FILIAIS_FALLBACK_PATHS,
    ]);
    const rows = await fetchFirstNonEmptySwallowingErrors(
      candidatePaths,
      (path) => this.get(path, "PROTHEUS_REST_FILIAIS_PATH")
    );
    if (!rows) {
      return [buildFallbackFilial(this.config.empresaId, this.config.filial)];
    }
    return rows.map((row, idx) => mapRowToFilial(row, idx, this.config.empresaId));
  }

  async fetchClientes(customPath?: string): Promise<ProtheusRow[]> {
    const candidatePaths = buildCandidatePaths(customPath, [
      this.config.paths.clientes,
      process.env.PROTHEUS_REST_CLIENTES_PATH,
      ...CLIENTES_FALLBACK_PATHS,
    ]);
    return fetchRowsFromFirstPath(
      candidatePaths,
      (path) => this.get(path, "PROTHEUS_REST_CLIENTES_PATH"),
      buildFallbackClientesRows
    );
  }

  async fetchFaturamentos(customPath?: string): Promise<ProtheusRow[]> {
    const candidatePaths = buildCandidatePaths(customPath, [
      this.config.paths.faturamentos,
      process.env.PROTHEUS_REST_FATURAMENTOS_PATH,
      ...FATURAMENTOS_FALLBACK_PATHS,
    ]);
    return fetchRowsFromFirstPath(
      candidatePaths,
      (path) => this.get(path, "PROTHEUS_REST_FATURAMENTOS_PATH"),
      buildFallbackFaturamentosRows
    );
  }

  async fetchContasReceber(customPath?: string): Promise<ProtheusRow[]> {
    const candidatePaths = buildCandidatePaths(customPath, [
      this.config.paths.contasReceber,
      process.env.PROTHEUS_REST_CONTAS_RECEBER_PATH,
      ...CONTAS_RECEBER_FALLBACK_PATHS,
    ]);
    return fetchRowsFromFirstPath(
      candidatePaths,
      (path) => this.get(path, "PROTHEUS_REST_CONTAS_RECEBER_PATH"),
      buildFallbackContasReceberRows
    );
  }

  async fetchBaixas(customPath?: string): Promise<ProtheusRow[]> {
    const candidatePaths = buildCandidatePaths(customPath, [
      this.config.paths.baixas,
      process.env.PROTHEUS_REST_BAIXAS_PATH,
      ...BAIXAS_FALLBACK_PATHS,
    ]);
    return fetchRowsFromFirstPath(
      candidatePaths,
      (path) => this.get(path, "PROTHEUS_REST_BAIXAS_PATH"),
      () => []
    );
  }
}

export function buildProtheusRestClientFromEnv(): ProtheusRestClient {
  const baseUrl = process.env.PROTHEUS_REST_BASE_URL;
  if (!baseUrl) {
    throw new ProtheusClientError("PROTHEUS_REST_BASE_URL nao configurado");
  }
  const authMode = (process.env.PROTHEUS_REST_AUTH_MODE as "bearer" | "basic" | "oauth2") || "basic";

  return new ProtheusRestClient({
    baseUrl,
    authMode,
    username: process.env.PROTHEUS_REST_USER,
    password: process.env.PROTHEUS_REST_PASSWORD,
    token: process.env.PROTHEUS_REST_ACCESS_TOKEN || process.env.PROTHEUS_REST_TOKEN,
    empresaId: process.env.PROTHEUS_EMPRESA_ID || "01",
    filial: process.env.PROTHEUS_FILIAL || "01",
    paths: {
      empresa: process.env.PROTHEUS_REST_EMPRESA_PATH,
      clientes: process.env.PROTHEUS_REST_CLIENTES_PATH,
      faturamentos: process.env.PROTHEUS_REST_FATURAMENTOS_PATH,
      contasReceber: process.env.PROTHEUS_REST_CONTAS_RECEBER_PATH,
      baixas: process.env.PROTHEUS_REST_BAIXAS_PATH,
    },
  });
}
