/**
 * Diagnóstico SOMENTE LEITURA do Protheus (apenas GET em genericQuery).
 * Mostra: (1) se SE1/SE2/SE5 respondem, com o status real (sem fallback de mock);
 * (2) quais campos existem; (3) tipos de título com quantidade e total.
 *
 * Uso (token vigente em PROTHEUS_REST_ACCESS_TOKEN, gerado pelo botão do app):
 *   pnpm tsx scripts/diagnostico-tipos.ts
 */
import { readFileSync } from "node:fs";
import { readPage } from "../src/lib/integration/_internals/rest-parse-response";
import type { ProtheusRow } from "../src/lib/integration/protheus-client";

const PAGE_SIZE = 500;
const MAX_PAGINAS = 100;

interface Alvo {
  tabela: string;
  grupo: string[];
  valor: string;
  probe: string[];
}

const ALVOS: Alvo[] = [
  { tabela: "SE1", grupo: ["E1_TIPO"], valor: "E1_VALOR", probe: ["E1_FILIAL", "E1_SALDO", "E1_NUM", "E1_CLIENTE"] },
  { tabela: "SE2", grupo: ["E2_TIPO"], valor: "E2_VALOR", probe: ["E2_FILIAL", "E2_SALDO", "E2_NUM", "E2_FORNECE", "E2_LOJA", "E2_NOMFOR"] },
  {
    tabela: "SE5",
    grupo: ["E5_RECPAG", "E5_TIPODOC", "E5_TIPO"],
    valor: "E5_VALOR",
    probe: ["E5_NUM", "E5_NUMERO", "E5_BAIXA", "E5_DATA", "E5_DTDISPO", "E5_SEQ", "E5_SITUACA", "E5_CLIFOR", "E5_FILBAI"],
  },
];

function escrever(texto: string): void {
  process.stdout.write(`${texto}\n`);
}

function carregarEnv(): void {
  try {
    for (const linha of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch (err) {
    escrever(`[diagnostico] .env nao lido (${String(err)}); usando variaveis do shell`);
  }
}

async function consultar(tabela: string, campos: string[], page: number, pageSize: number): Promise<ProtheusRow[]> {
  const path = `/rest/api/framework/v1/genericQuery?tables=${tabela}&fields=${campos.join(",")}`;
  const url = new URL(path, process.env.PROTHEUS_REST_BASE_URL);
  url.searchParams.set("page", String(page));
  url.searchParams.set("pagesize", String(pageSize));
  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${process.env.PROTHEUS_REST_ACCESS_TOKEN}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (resp.status === 401) throw new Error("401 - token expirado; gere outro pelo app");
  return (await readPage(resp, path)).rows;
}

async function probeCampos(alvo: Alvo): Promise<void> {
  escrever(`\n== ${alvo.tabela}: campos`);
  for (const campo of [alvo.valor, ...alvo.grupo, ...alvo.probe]) {
    try {
      await consultar(alvo.tabela, [campo], 1, 1);
      escrever(`  OK    ${campo}`);
    } catch (err) {
      escrever(`  ERRO  ${campo} -> ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function agruparTipos(alvo: Alvo): Promise<void> {
  const totais = new Map<string, { qtd: number; total: number }>();
  const campos = [...alvo.grupo, alvo.valor];
  let truncado = false;
  try {
    for (let page = 1; page <= MAX_PAGINAS; page++) {
      const rows = await consultar(alvo.tabela, campos, page, PAGE_SIZE);
      for (const row of rows) {
        const chave = alvo.grupo.map((c) => (row[c] ?? "").trim() || "(vazio)").join(" | ");
        const atual = totais.get(chave) ?? { qtd: 0, total: 0 };
        atual.qtd += 1;
        atual.total += parseFloat(row[alvo.valor] ?? "0") || 0;
        totais.set(chave, atual);
      }
      if (rows.length < PAGE_SIZE) break;
      if (page === MAX_PAGINAS) truncado = true;
    }
  } catch (err) {
    escrever(`\n== ${alvo.tabela}: FALHOU -> ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  escrever(`\n== ${alvo.tabela}: ${alvo.grupo.join(" | ")} | qtd | total`);
  for (const [chave, v] of [...totais.entries()].sort((a, b) => b[1].total - a[1].total)) {
    escrever(`  ${chave} | ${v.qtd} | ${v.total.toFixed(2)}`);
  }
  if (truncado) escrever(`  AVISO: leitura limitada a ${MAX_PAGINAS * PAGE_SIZE} linhas`);
}

async function main(): Promise<void> {
  carregarEnv();
  if (!process.env.PROTHEUS_REST_BASE_URL || !process.env.PROTHEUS_REST_ACCESS_TOKEN) {
    escrever("[diagnostico] defina PROTHEUS_REST_BASE_URL e PROTHEUS_REST_ACCESS_TOKEN");
    return;
  }
  for (const alvo of ALVOS) {
    await probeCampos(alvo);
    await agruparTipos(alvo);
  }
}

main().catch((err) => escrever(`[diagnostico] erro inesperado: ${String(err)}`));
