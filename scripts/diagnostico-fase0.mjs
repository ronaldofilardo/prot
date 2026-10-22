import { readFileSync } from "node:fs";

function carregarEnv() {
  try {
    for (const linha of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch (err) {
    console.error("Erro ao ler .env:", err.message);
  }
}

carregarEnv();

const base = process.env.PROTHEUS_REST_BASE_URL;
const token = process.env.PROTHEUS_REST_ACCESS_TOKEN;

if (!base || !token) {
  console.error("Defina PROTHEUS_REST_BASE_URL e PROTHEUS_REST_ACCESS_TOKEN no .env");
  process.exit(1);
}

const cenarios = [
  {
    nome: "SE1 (Contas a Receber) sem tenantId",
    path: "/rest/api/framework/v1/genericQuery?tables=SE1&fields=E1_FILIAL,E1_NUM,E1_SALDO&pageSize=5",
    headers: {},
  },
  {
    nome: "SE5 (Movimentacao Bancaria/Baixas) sem tenantId",
    path: "/rest/api/framework/v1/genericQuery?tables=SE5&fields=E5_FILIAL,E5_NUMERO,E5_VALOR&pageSize=5",
    headers: {},
  },
  {
    nome: "SE2 (Contas a Pagar) sem tenantId",
    path: "/rest/api/framework/v1/genericQuery?tables=SE2&fields=E2_FILIAL,E2_NUM,E2_SALDO&pageSize=5",
    headers: {},
  },
  {
    nome: "SE1 com header tenantId: 001,00101001",
    path: "/rest/api/framework/v1/genericQuery?tables=SE1&fields=E1_FILIAL,E1_NUM,E1_SALDO&pageSize=5",
    headers: { tenantId: "001,00101001" },
  },
  {
    nome: "SE5 com header tenantId: 001,00101001",
    path: "/rest/api/framework/v1/genericQuery?tables=SE5&fields=E5_FILIAL,E5_NUMERO,E5_VALOR&pageSize=5",
    headers: { tenantId: "001,00101001" },
  },
  {
    nome: "SF2 com where=F2_EMISSAO >= '20250101'",
    path: "/rest/api/framework/v1/genericQuery?tables=SF2&fields=F2_DOC,F2_EMISSAO&pageSize=5&where=F2_EMISSAO >= '20250101'",
    headers: {},
  },
  {
    nome: "CT7 sem fields (descoberta de campos de saldo)",
    path: "/rest/api/framework/v1/genericQuery?tables=CT7&pageSize=1",
    headers: {},
  },
  {
    nome: "CQ0 sem fields (descoberta de campos de saldo)",
    path: "/rest/api/framework/v1/genericQuery?tables=CQ0&pageSize=1",
    headers: {},
  },
];

async function executarDiagnosticos() {
  const resultados = [];

  for (const c of cenarios) {
    const url = new URL(c.path, base);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...c.headers,
    };

    const inicio = Date.now();
    try {
      const res = await fetch(url, { headers });
      const tempo = Date.now() - inicio;
      const texto = await res.text();
      let totalItens = 0;
      let amostra = null;
      let camposDisponiveis = [];

      try {
        const j = JSON.parse(texto);
        const rows = Array.isArray(j) ? j : j.items ?? j.data ?? [];
        totalItens = rows.length;
        if (rows.length > 0) {
          amostra = rows[0];
          camposDisponiveis = Object.keys(rows[0]);
        }
      } catch {
        // resposta não-JSON
      }

      resultados.push({
        cenario: c.nome,
        path: c.path,
        headers: c.headers,
        status: res.status,
        tempoMs: tempo,
        totalItens,
        camposDisponiveis: camposDisponiveis.slice(0, 15).join(", "),
        erro: !res.ok ? texto.slice(0, 200) : null,
        amostra: amostra ? JSON.stringify(amostra).slice(0, 200) : null,
      });
    } catch (err) {
      resultados.push({
        cenario: c.nome,
        path: c.path,
        headers: c.headers,
        status: "ERRO_CONEXAO",
        tempoMs: Date.now() - inicio,
        totalItens: 0,
        erro: err.message,
      });
    }
  }

  console.log(JSON.stringify(resultados, null, 2));
}

executarDiagnosticos().catch(console.error);
