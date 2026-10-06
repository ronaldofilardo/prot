import {
  type ProtheusClient,
  type ProtheusEmpresaInfo,
  type ProtheusFilialInfo,
  type ProtheusRow,
} from "./protheus-client";
import type { ProtheusRestConfig } from "./_internals/rest-types";
import { fetchAllPages } from "./_internals/rest-fetch";
import {
  fetchEmpresa,
  fetchFiliais,
  fetchClientes,
  fetchFaturamentos,
  fetchContasReceber,
  fetchBaixas,
  fetchSaldosContabeis,
} from "./_internals/rest-entity-fetchers";

export type { ProtheusRestConfig } from "./_internals/rest-types";

/**
 * Cliente REST nativo do Protheus (modo primário de integracao).
 *
 * Assume o padrao mais comum de exposicao REST do Protheus (TOTVS REST /
 * framework FWMBrowse, "REST Community" ou API customizada em TLPP):
 * endpoints que retornam JSON com os campos crus da tabela (A1_COD,
 * A1_NOME, F2_DOC, etc), filtráveis por empresa/filial.
 *
 * Somente leitura: esta classe nao expõe nenhum metodo de escrita.
 */

export class ProtheusRestClient implements ProtheusClient {
  constructor(private readonly config: ProtheusRestConfig) {}

  private async get(path: string | undefined, settingName: string): Promise<ProtheusRow[]> {
    return fetchAllPages((page, pageSize) => this.getPage(path, settingName, page, pageSize), { pageSize: 100 });
  }

  private async getPage(
    path: string | undefined,
    settingName: string,
    page: number,
    pageSize: number
  ): Promise<{ rows: ProtheusRow[]; hasNext: boolean }> {
    const { fetchPage } = await import("./_internals/rest-fetch");
    return fetchPage(path, this.config, settingName, page, pageSize);
  }

  async fetchEmpresa(customPath?: string): Promise<ProtheusEmpresaInfo | null> {
    return fetchEmpresa(this.config, customPath, (path) => this.get(path, "PROTHEUS_REST_EMPRESA_PATH"));
  }

  async fetchFiliais(customPath?: string): Promise<ProtheusFilialInfo[]> {
    return fetchFiliais(this.config, customPath, (path) => this.get(path, "PROTHEUS_REST_FILIAIS_PATH"));
  }

  async fetchClientes(customPath?: string): Promise<ProtheusRow[]> {
    return fetchClientes(this.config, customPath, (path) => this.get(path, "PROTHEUS_REST_CLIENTES_PATH"));
  }

  async fetchFaturamentos(customPath?: string): Promise<ProtheusRow[]> {
    return fetchFaturamentos(this.config, customPath, (path) => this.get(path, "PROTHEUS_REST_FATURAMENTOS_PATH"));
  }

  async fetchContasReceber(customPath?: string): Promise<ProtheusRow[]> {
    return fetchContasReceber(this.config, customPath, (path) => this.get(path, "PROTHEUS_REST_CONTAS_RECEBER_PATH"));
  }

  async fetchBaixas(customPath?: string): Promise<ProtheusRow[]> {
    return fetchBaixas(this.config, customPath, (path) => this.get(path, "PROTHEUS_REST_BAIXAS_PATH"));
  }

  async fetchSaldosContabeis(customPath?: string): Promise<ProtheusRow[]> {
    return fetchSaldosContabeis(this.config, customPath, (path) => this.get(path, "PROTHEUS_REST_SALDOS_CONTABEIS_PATH"));
  }
}

export { buildProtheusRestClientFromEnv, createProtheusRestClient } from "./_internals/rest-factory";