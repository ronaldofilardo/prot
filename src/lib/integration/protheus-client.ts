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
  /** Nome da filial (SM0.M0_FILIAL), quando diferente da razão social. */
  nomeFilial?: string;
  /** Empresa do SaaS (tabela Empresa) vinculada a esta filial, quando existir. */
  empresaVinculadaId?: string;
}

/**
 * Resultado da consulta "filiais do usuário Protheus".
 * `restricaoAplicada` = true quando a lista foi efetivamente limitada às
 * filiais que o usuário pode acessar; false quando só foi possível obter o
 * cadastro completo de filiais (SM0) do ambiente.
 */
export interface ProtheusFiliaisUsuario {
  filiais: ProtheusFilialInfo[];
  usuario: string | null;
  restricaoAplicada: boolean;
  aviso?: string;
}

export interface ProtheusClient {
  fetchEmpresa(customPath?: string): Promise<ProtheusEmpresaInfo | null>;
  fetchFiliais(customPath?: string): Promise<ProtheusFilialInfo[]>;
  /** Filiais (SM0) que o usuário Protheus informado pode acessar. Opcional: o SOAP não implementa. */
  fetchFiliaisUsuario?(usuario: string | null): Promise<ProtheusFiliaisUsuario>;
  fetchClientes(): Promise<ProtheusRow[]>;
  fetchFaturamentos(): Promise<ProtheusRow[]>;
  fetchContasReceber(): Promise<ProtheusRow[]>;
  fetchBaixas(): Promise<ProtheusRow[]>;
  fetchSaldosContabeis(): Promise<ProtheusRow[]>;
  fetchItensVenda?(customPath?: string): Promise<ProtheusRow[]>;
}

export class ProtheusClientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ProtheusClientError";
  }
}
