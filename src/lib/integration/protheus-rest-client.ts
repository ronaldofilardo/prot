import { ProtheusClient, ProtheusClientError, ProtheusRow } from "./protheus-client";

/**
 * Cliente REST nativo do Protheus (modo primário de integração).
 *
 * Assume o padrão mais comum de exposição REST do Protheus (TOTVS REST /
 * framework FWMBrowse, "REST Community" ou API customizada em TLPP):
 * endpoints que retornam JSON com os campos crus da tabela (A1_COD,
 * A1_NOME, F2_DOC, etc), filtráveis por empresa/filial.
 *
 * *** AJUSTAR CONFORME O AMBIENTE ***
 * O caminho exato de cada endpoint e o método de autenticação variam
 * entre instalações Protheus (versão, módulos habilitados, customizações
 * do cliente TOTVS). Os pontos marcados com TODO precisam ser
 * confirmados com o time responsável pelo Protheus antes de apontar
 * para produção — ver docs/protheus-integracao-decisao.md, Fase 0.
 *
 * Somente leitura: esta classe não expõe nenhum método de escrita.
 */

interface ProtheusRestConfig {
  baseUrl: string;
  authMode: "bearer" | "basic";
  username?: string;
  password?: string;
  token?: string;
  empresaId: string; // empresa Protheus (código da empresa no ERP, não o id do tenant SaaS)
  filial: string;
}

export class ProtheusRestClient implements ProtheusClient {
  constructor(private readonly config: ProtheusRestConfig) {}

  private authHeader(): string {
    if (this.config.authMode === "bearer") {
      // TODO: a maioria dos ambientes TOTVS usa OAuth2 client_credentials
      // num endpoint separado (ex: /api/oauth2/v1/token) que devolve um
      // token de curta duração. Se for o caso deste ambiente, trocar isto
      // por uma chamada real de obtenção de token (com cache em memória
      // até expirar), em vez de depender de um token fixo via env.
      if (!this.config.token) {
        throw new ProtheusClientError("PROTHEUS_REST_TOKEN nao configurado (authMode=bearer)");
      }
      return `Bearer ${this.config.token}`;
    }
    if (!this.config.username || !this.config.password) {
      throw new ProtheusClientError("PROTHEUS_REST_USER/PROTHEUS_REST_PASSWORD nao configurados (authMode=basic)");
    }
    const raw = `${this.config.username}:${this.config.password}`;
    return `Basic ${Buffer.from(raw).toString("base64")}`;
  }

  private async get(path: string): Promise<ProtheusRow[]> {
    const url = new URL(path, this.config.baseUrl);
    url.searchParams.set("empresa", this.config.empresaId);
    url.searchParams.set("filial", this.config.filial);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: this.authHeader(),
          Accept: "application/json",
        },
        // Evita cache do fetch do Next.js — cada clique no botão precisa
        // ir buscar o dado atual no Protheus, nunca uma resposta velha.
        cache: "no-store",
      });
    } catch (err) {
      throw new ProtheusClientError(`Falha de rede ao consultar Protheus REST (${path})`, err);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ProtheusClientError(
        `Protheus REST retornou ${response.status} em ${path}: ${body.slice(0, 300)}`
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (err) {
      throw new ProtheusClientError(`Resposta invalida (nao-JSON) de ${path}`, err);
    }

    // TODO: o "shape" exato da resposta varia entre instalações (alguns
    // endpoints retornam { items: [...] }, outros { data: [...] }, outros
    // um array puro no corpo). Ajustar a extração abaixo conforme o
    // retorno real do ambiente de destino.
    if (Array.isArray(json)) return json as ProtheusRow[];
    const obj = json as { items?: ProtheusRow[]; data?: ProtheusRow[] };
    return obj.items ?? obj.data ?? [];
  }

  // TODO: confirmar os paths reais dos endpoints REST habilitados no
  // Protheus de destino. Os paths abaixo são placeholders com o nome
  // convencional das tabelas usadas hoje via CSV (SA1/SF2/SE1/SE5).
  fetchClientes(): Promise<ProtheusRow[]> {
    return this.get("/rest/api/framework/v1/genericQuery/SA1");
  }

  fetchFaturamentos(): Promise<ProtheusRow[]> {
    return this.get("/rest/api/framework/v1/genericQuery/SF2");
  }

  fetchContasReceber(): Promise<ProtheusRow[]> {
    return this.get("/rest/api/framework/v1/genericQuery/SE1");
  }

  fetchBaixas(): Promise<ProtheusRow[]> {
    return this.get("/rest/api/framework/v1/genericQuery/SE5");
  }
}

export function buildProtheusRestClientFromEnv(): ProtheusRestClient {
  const baseUrl = process.env.PROTHEUS_REST_BASE_URL;
  if (!baseUrl) {
    throw new ProtheusClientError("PROTHEUS_REST_BASE_URL nao configurado");
  }
  const authMode = (process.env.PROTHEUS_REST_AUTH_MODE as "bearer" | "basic") || "basic";

  return new ProtheusRestClient({
    baseUrl,
    authMode,
    username: process.env.PROTHEUS_REST_USER,
    password: process.env.PROTHEUS_REST_PASSWORD,
    token: process.env.PROTHEUS_REST_TOKEN,
    empresaId: process.env.PROTHEUS_EMPRESA_ID || "01",
    filial: process.env.PROTHEUS_FILIAL || "01",
  });
}
