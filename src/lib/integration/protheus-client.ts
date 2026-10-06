/**
 * Contrato do cliente Protheus — abstrai o meio de transporte (REST/SOAP)
 * dos dados que chegam ao resto do pipeline.
 *
 * Cada método retorna a "linha bruta" no formato de campos Protheus
 * (ex: A1_COD, A1_NOME, F2_DOC...), no MESMO shape que os adapters em
 * `protheus-adapter.ts` já esperam vindo do CSV. Isso significa que todo
 * o restante do pipeline (adapter → canonical → sync-engine) não muda
 * nada — só troca a origem do dado (arquivo → chamada de API).
 *
 * Decisão de integração (ver docs/protheus-integracao-decisao.md):
 *   - REST nativo é o modo primário (PROTHEUS_INTEGRATION_MODE=rest)
 *   - SOAP é o fallback para instalações sem REST habilitado (=soap)
 *   - Conexão direta ao banco e middleware ODBC/JDBC foram descartados
 *     (ver docs/protheus-integracao-decisao.md para a justificativa)
 *
 * Este sistema é somente-consumidor: não existe (nem está previsto)
 * nenhum método de escrita de volta para o Protheus.
 */

export type ProtheusRow = Record<string, string>;

export interface ProtheusEmpresaInfo {
  nome: string;
  cnpj: string;
  codigoEmpresa?: string;
  codigoFilial?: string;
}

export interface ProtheusFilialInfo {
  id?: string;
  codigoEmpresa: string;
  codigoUnidade?: string;
  codigoFilial: string;
  filialCompleta?: string;
  nome: string;
  cnpj?: string;
  tipo: "Matriz" | "Filial";
  cidade?: string;
  uf?: string;
  status?: "Ativa" | "Inativa";
}

export interface ProtheusClient {
  fetchEmpresa(customPath?: string): Promise<ProtheusEmpresaInfo | null>;
  fetchFiliais(customPath?: string): Promise<ProtheusFilialInfo[]>;
  fetchClientes(): Promise<ProtheusRow[]>;
  fetchFaturamentos(): Promise<ProtheusRow[]>;
  fetchContasReceber(): Promise<ProtheusRow[]>;
  fetchBaixas(): Promise<ProtheusRow[]>;
  fetchSaldosContabeis(): Promise<ProtheusRow[]>;
}

export class ProtheusClientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ProtheusClientError";
  }
}
