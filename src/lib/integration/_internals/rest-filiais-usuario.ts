import type { ProtheusFiliaisUsuario, ProtheusRow } from "../protheus-client";
import { mapSm0Rows } from "./rest-parse-filial-sm0";
import {
  ACESSO_FILIAIS_PATH,
  SM0_FILIAIS_PATHS,
  USUARIOS_PATH,
  buildCandidatePaths,
} from "./rest-paths";
import { firstTruthy } from "./rest-parse-url";
import type { ProtheusRestConfig } from "./rest-types";

type GetRows = (path: string) => Promise<ProtheusRow[]>;

interface AcessoEntrada {
  grupo: string; // "*" = todos os grupos
  filial: string; // "*" = todas as filiais do grupo
}

/** No Protheus, "@@" / "@@@@" significam "todas". */
const ehCuringa = (v: string) => v.length > 0 && /^@+$/.test(v);
const norm = (v: string | undefined) => (v ?? "").trim();

function parseAcesso(rows: ProtheusRow[]): AcessoEntrada[] {
  const entradas: AcessoEntrada[] = [];
  for (const r of rows) {
    const grupo = norm(firstTruthy(r.USR_GRUPEMP, r.M0_CODIGO, r.codigoEmpresa, r.empresa));
    const filial = norm(firstTruthy(r.USR_FILIAL, r.M0_CODFIL, r.codigoFilial, r.branchId, r.filial));
    // Linha sem nenhum dado nunca pode virar "acesso a tudo".
    if (!grupo && !filial) continue;
    entradas.push({
      grupo: !grupo || ehCuringa(grupo) ? "*" : grupo,
      filial: !filial || ehCuringa(filial) ? "*" : filial,
    });
  }
  return entradas;
}

function permitida(row: ProtheusRow, acesso: AcessoEntrada[], empresaPadrao: string): boolean {
  const grupo = norm(firstTruthy(row.M0_CODIGO, row.codigoEmpresa, empresaPadrao));
  const codFil = norm(firstTruthy(row.M0_CODFIL, row.codigoFilial, row.branchId, row.filial, row.codigo));
  return acesso.some(
    (a) => (a.grupo === "*" || a.grupo === grupo) && (a.filial === "*" || a.filial === codFil)
  );
}

/** Rotulo curto do endpoint para mensagens (ex.: "genericQuery(SM0)"). */
function rotulo(caminho: string): string {
  const tabela = caminho.match(/tables=([A-Za-z0-9_]+)/)?.[1];
  const base = caminho.split("?")[0].replace(/^\/rest/, "").split("/").pop() || caminho;
  return tabela ? `${base}(${tabela})` : caminho.split("?")[0];
}

/** Tenta cada endpoint e guarda o motivo de cada falha para diagnostico. */
async function consultarSm0(caminhos: string[], getRows: GetRows): Promise<{ rows: ProtheusRow[]; tentativas: string[] }> {
  const tentativas: string[] = [];
  for (const caminho of caminhos) {
    try {
      const rows = await getRows(caminho);
      if (rows.length > 0) return { rows, tentativas };
      tentativas.push(`${rotulo(caminho)}: sem linhas`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro";
      tentativas.push(`${rotulo(caminho)}: ${/\b(\d{3})\b/.exec(msg)?.[1] ?? msg.slice(0, 60)}`);
    }
  }
  return { rows: [], tentativas };
}

async function resolverAcessoUsuario(usuario: string, getRows: GetRows): Promise<AcessoEntrada[]> {
  const caminhoAcesso = process.env.PROTHEUS_REST_FILIAIS_ACESSO_PATH;

  // Endpoint proprio que ja devolve as filiais do usuario: {usuario} e substituido.
  if (caminhoAcesso && caminhoAcesso.includes("{usuario}")) {
    const rows = await getRows(caminhoAcesso.replace("{usuario}", encodeURIComponent(usuario)));
    return parseAcesso(rows);
  }

  // Padrao: SYS_USR (login -> USR_ID) + SYS_USR_FILIAL (acessos do USR_ID).
  const usuarios = await getRows(process.env.PROTHEUS_REST_USUARIOS_PATH || USUARIOS_PATH);
  const alvo = usuario.toLowerCase();
  const registro = usuarios.find((u) => norm(firstTruthy(u.USR_CODIGO, u.login, u.username)).toLowerCase() === alvo);
  const usrId = norm(firstTruthy(registro?.USR_ID, registro?.id));
  if (!usrId) return [];

  const acessos = await getRows(caminhoAcesso || ACESSO_FILIAIS_PATH);
  return parseAcesso(acessos.filter((a) => !a.USR_ID || norm(a.USR_ID) === usrId));
}

function buildSm0EmptyResult(usuario: string | null, tentativas: string[]): ProtheusFiliaisUsuario {
  return {
    filiais: [],
    usuario,
    restricaoAplicada: false,
    aviso: `O Protheus não retornou o cadastro de filiais (SM0). Tentativas: ${tentativas.join("; ")}. Rode scripts/diagnostico-filiais-protheus.mjs ou defina PROTHEUS_REST_SM0_PATH.`,
  };
}

function buildSemUsuarioResult(rows: ProtheusRow[], empresaId: string): ProtheusFiliaisUsuario {
  return {
    filiais: mapSm0Rows(rows, empresaId),
    usuario: null,
    restricaoAplicada: false,
    aviso: "Usuário Protheus não identificado: exibindo todas as filiais do ambiente.",
  };
}

function buildAcessoVazioResult(
  rows: ProtheusRow[],
  empresaId: string,
  usuario: string,
  motivo: string
): ProtheusFiliaisUsuario {
  return {
    filiais: mapSm0Rows(rows, empresaId),
    usuario,
    restricaoAplicada: false,
    aviso: `Não foi possível restringir pelas permissões do usuário (${motivo}). Exibindo todas as filiais do ambiente.`,
  };
}

interface PermissoesResolvidas {
  acesso: AcessoEntrada[];
  motivo: string;
}

async function resolvePermissoes(usuario: string, getRows: GetRows): Promise<PermissoesResolvidas> {
  let acesso: AcessoEntrada[] = [];
  let motivo = "";
  try {
    acesso = await resolverAcessoUsuario(usuario, getRows);
    if (acesso.length === 0) motivo = `nenhum acesso a filiais encontrado para "${usuario}"`;
  } catch (err) {
    motivo = err instanceof Error ? err.message : "falha ao consultar acessos";
  }
  return { acesso, motivo };
}

export async function fetchFiliaisUsuario(
  config: ProtheusRestConfig,
  usuario: string | null,
  getRows: GetRows
): Promise<ProtheusFiliaisUsuario> {
  // PROTHEUS_REST_SM0_PATH pode ser um endpoint proprio; {usuario} e substituido pelo login.
  const caminhoProprio = process.env.PROTHEUS_REST_SM0_PATH?.replace("{usuario}", encodeURIComponent(usuario ?? ""));
  const caminhos = buildCandidatePaths(undefined, [caminhoProprio, ...SM0_FILIAIS_PATHS]);
  const { rows: rowsSm0, tentativas } = await consultarSm0(caminhos, getRows);
  if (rowsSm0.length === 0) return buildSm0EmptyResult(usuario, tentativas);

  // Endpoint proprio que ja devolve somente as filiais permitidas ao usuario.
  if (process.env.PROTHEUS_REST_SM0_FILTRADO_POR_USUARIO === "true") {
    return { filiais: mapSm0Rows(rowsSm0, config.empresaId), usuario, restricaoAplicada: true };
  }

  if (!usuario) return buildSemUsuarioResult(rowsSm0, config.empresaId);

  const uNorm = usuario.trim().toLowerCase();
  if (uNorm === "admin" || uNorm === "administrador") {
    return { filiais: mapSm0Rows(rowsSm0, config.empresaId), usuario, restricaoAplicada: true };
  }

  const { acesso, motivo } = await resolvePermissoes(usuario, getRows);
  if (acesso.length === 0) return buildAcessoVazioResult(rowsSm0, config.empresaId, usuario, motivo);

  const permitidas = rowsSm0.filter((r) => permitida(r, acesso, config.empresaId));
  return { filiais: mapSm0Rows(permitidas, config.empresaId), usuario, restricaoAplicada: true };
}
