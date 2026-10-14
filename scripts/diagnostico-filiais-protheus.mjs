// Diagnostico (somente leitura) das filiais do usuario no Protheus.
// Uso:  node scripts/diagnostico-filiais-protheus.mjs [login_protheus]
// Le PROTHEUS_REST_BASE_URL e PROTHEUS_REST_ACCESS_TOKEN do .env (ou do ambiente).
import { readFileSync } from "node:fs";

function carregarEnv() {
  try {
    for (const linha of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* sem .env: usa so o ambiente */
  }
}

carregarEnv();
const base = process.env.PROTHEUS_REST_BASE_URL;
const token = process.env.PROTHEUS_REST_ACCESS_TOKEN;
const usuario = (process.argv[2] || process.env.PROTHEUS_REST_USER || "").toLowerCase();
if (!base || !token) {
  console.error("Defina PROTHEUS_REST_BASE_URL e PROTHEUS_REST_ACCESS_TOKEN no .env");
  process.exit(1);
}

async function consulta(titulo, tabela, campos) {
  const url = new URL("/rest/api/framework/v1/genericQuery", base);
  url.searchParams.set("tables", tabela);
  url.searchParams.set("fields", campos);
  url.searchParams.set("pageSize", "500");
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    const texto = await res.text();
    if (!res.ok) {
      console.log(`\n== ${titulo} (${tabela}) -> HTTP ${res.status}\n${texto.slice(0, 300)}`);
      return [];
    }
    const json = JSON.parse(texto);
    const rows = Array.isArray(json) ? json : json.items ?? json.data ?? [];
    console.log(`\n== ${titulo} (${tabela}) -> ${rows.length} linha(s)`);
    console.table(rows.slice(0, 50));
    return rows;
  } catch (err) {
    console.log(`\n== ${titulo} (${tabela}) -> erro: ${err.message}`);
    return [];
  }
}

async function sondar(caminho) {
  try {
    const res = await fetch(new URL(caminho, base), { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    const texto = await res.text();
    let linhas = "-";
    try {
      const j = JSON.parse(texto);
      linhas = (Array.isArray(j) ? j : j.items ?? j.data ?? []).length;
    } catch { /* corpo nao-JSON */ }
    console.log(`  HTTP ${res.status}  linhas: ${linhas}  ${caminho}`);
  } catch (err) {
    console.log(`  erro: ${err.message}  ${caminho}`);
  }
}

try {
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  console.log("== Claims do token (sem a assinatura):");
  console.log(claims);
} catch {
  console.log("== Token nao e um JWT legivel");
}

console.log("== Sondagem de endpoints candidatos para filiais");
for (const c of [
  "/rest/api/framework/v1/genericQuery?tables=SM0&fields=M0_CODIGO,M0_CODFIL,M0_FILIAL,M0_NOME,M0_NOMECOM,M0_CGC&pageSize=5",
  "/rest/api/framework/v1/genericQuery?tables=SYS_COMPANY&fields=M0_CODIGO,M0_CODFIL,M0_FILIAL,M0_NOME,M0_NOMECOM,M0_CGC&pageSize=5",
  "/rest/api/framework/v1/genericQuery?tables=SA1&fields=A1_FILIAL,A1_COD&pageSize=5",
  "/api/rh/v1/monitor-ng/filiais",
  "/rest/api/rh/v1/monitor-ng/filiais",
  "/rest/api/framework/v1/branches",
  "/api/framework/v1/branches",
  "/rest/api/protheus/v1/filiais",
  "/rest/api/protheus/v1/companies",
  "/api/protheus/v1/companies",
  "/rest/api/framework/v1/companies",
]) await sondar(c);

// Mostra o corpo real das rotas de RH (formato desconhecido) para mapear os campos.
for (const c of ["/api/rh/v1/monitor-ng/filiais", "/rest/api/rh/v1/monitor-ng/filiais"]) {
  try {
    const res = await fetch(new URL(c, base), { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    const texto = await res.text();
    console.log(`\n== ${c} -> HTTP ${res.status}\n${texto.slice(0, 1500)}`);
  } catch (err) {
    console.log(`\n== ${c} -> erro: ${err.message}`);
  }
}

await consulta("Filiais (SYS_COMPANY)", "SYS_COMPANY", "M0_CODIGO,M0_CODFIL,M0_FILIAL,M0_NOME,M0_NOMECOM,M0_CGC,M0_CIDENT,M0_ESTENT");
await consulta("Filiais do ambiente", "SM0", "M0_CODIGO,M0_CODFIL,M0_FILIAL,M0_NOME,M0_NOMECOM,M0_CGC,M0_CIDENT,M0_ESTENT");
const usuarios = await consulta("Usuarios", "SYS_USR", "USR_ID,USR_CODIGO,USR_NOME");
const alvo = usuarios.find((u) => String(u.USR_CODIGO ?? "").trim().toLowerCase() === usuario);
console.log(`\nUsuario "${usuario}" -> USR_ID: ${alvo?.USR_ID ?? "(nao encontrado)"}`);
const acessos = await consulta("Acesso a filiais", "SYS_USR_FILIAL", "USR_ID,USR_GRUPEMP,USR_FILIAL");
if (alvo) console.table(acessos.filter((a) => String(a.USR_ID).trim() === String(alvo.USR_ID).trim()));
