#!/usr/bin/env node
// REFACTORING_POLICY §12.2: guardrail de "linhas por arquivo + CC por função".
import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const CATEGORIAS = [
  { nome: "teste", limite: 250, re: /__tests__\/|\.test\./ },
  { nome: "componente", limite: 100, re: /src\/components\/.+\.tsx$/ },
  { nome: "pagina", limite: 150, re: /src\/.*page\.tsx$/ },
  { nome: "route", limite: 120, re: /src\/.*route\.ts$/ },
  { nome: "hook", limite: 120, re: /src\/hooks\/.+\.ts$/ },
  { nome: "client", limite: 200, re: /src\/lib\/integration\/.+\.ts$/ },
  { nome: "utilitario", limite: 120, re: /src\/lib\/utils\/.+\.ts$/ },
];

function listarArquivos(dir, acumulado = []) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      listarArquivos(caminho, acumulado);
    } else if (/\.tsx?$/.test(entrada.name) && !/\.d\.ts$/.test(entrada.name)) {
      acumulado.push(caminho.split(path.sep).join("/"));
    }
  }
  return acumulado;
}

function contarLinhas(caminho) {
  const conteudo = fs.readFileSync(caminho, "utf8").replace(/\r?\n$/, "");
  return conteudo.split(/\r?\n/).length;
}

function verificarLinhasPorArquivo() {
  const violacoes = [];
  for (const caminho of listarArquivos("src")) {
    const categoria = CATEGORIAS.find((c) => c.re.test(caminho));
    if (!categoria) continue;
    const linhas = contarLinhas(caminho);
    if (linhas > categoria.limite) {
      violacoes.push(`${caminho}: ${linhas} > ${categoria.limite} linhas [${categoria.nome}]`);
    }
  }
  return violacoes;
}

async function verificarComplexidade() {
  const eslint = new ESLint({ overrideConfig: [{ rules: { complexity: ["error", 10] } }] });
  const resultados = await eslint.lintFiles(["src/**/*.{ts,tsx}", "scripts/**/*.mjs"]);
  const raiz = process.cwd().split(path.sep).join("/");
  const violacoes = [];
  for (const resultado of resultados) {
    const arquivo = resultado.filePath.split(path.sep).join("/").replace(raiz, ".");
    for (const mensagem of resultado.messages) {
      if (mensagem.ruleId === "complexity") {
        violacoes.push(`${arquivo}:${mensagem.line} — ${mensagem.message}`);
      }
    }
  }
  return violacoes;
}

function imprimir(nome, violacoes) {
  if (violacoes.length === 0) {
    console.log(`[check-quality] ${nome}: OK`);
    return;
  }
  console.error(`[check-quality] ${nome}: ${violacoes.length} violação(ões)`);
  for (const violacao of violacoes) console.error(`  - ${violacao}`);
}

async function main() {
  try {
    const linhas = verificarLinhasPorArquivo();
    const complexidade = await verificarComplexidade();
    console.log(`[check-quality] arquivos avaliados: ${listarArquivos("src").length} (src/)`);
    imprimir("linhas por arquivo (§4.1)", linhas);
    imprimir("complexidade ciclomática ≤ 10 por função (§4)", complexidade);
    if (linhas.length + complexidade.length > 0) {
      console.error("[check-quality] FALHOU");
      process.exitCode = 1;
      return;
    }
    console.log("[check-quality] PASSOU");
  } catch (erro) {
    console.error("[check-quality] erro inesperado:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  }
}

main();
