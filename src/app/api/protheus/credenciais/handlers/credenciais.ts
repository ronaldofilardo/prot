import { prisma } from "@/lib/db/prisma-client";
import { encryptText } from "@/lib/security/crypto-vault";
import { protheusTokenProvider } from "@/lib/integration/protheus-token-provider";
import { setMemoryToken } from "@/lib/integration/_internals/token-env-sync";
import { logApiError, logIntegration } from "@/lib/utils/logger";

import { parseJwtExpiry } from "@/lib/integration/_internals/token-network";

interface CredenciaisInput {
  username?: string;
  password?: string;
  baseUrl?: string;
  clientId?: string;
  accessToken?: string;
}

function cleanBaseUrl(url?: string): string {
  const fallback = "https://lc1contadores141403.protheus.cloudtotvs.com.br:1656";
  const raw = url?.trim() || process.env.PROTHEUS_REST_BASE_URL || fallback;
  return raw.replace(/\/rest\/index\/token|\/index\/token/i, "").replace(/\/+$/, "");
}

function resolvePasswordEnc(pass?: string): string {
  const fallback = "LC1sysC0nt@!2026adm!@";
  const raw = pass?.trim() || process.env.PROTHEUS_REST_PASSWORD || fallback;
  return encryptText(raw);
}

function resolveInput(input: CredenciaisInput) {
  const baseUrl = cleanBaseUrl(input.baseUrl);
  const username = input.username?.trim() || process.env.PROTHEUS_REST_USER || "admin";
  const clientId = input.clientId?.trim() || process.env.PROTHEUS_REST_CLIENT_ID || username;
  const passwordEnc = resolvePasswordEnc(input.password);
  return { baseUrl, clientId, passwordEnc };
}

async function upsertCredencial(empresaId: string, username: string, data: ReturnType<typeof resolveInput>) {
  await prisma.protheusCredencial.upsert({
    where: { empresaId },
    create: { empresaId, username, ...data },
    update: { ...data, username },
  });
}

function syncEnv(username: string, password?: string) {
  process.env.PROTHEUS_REST_USER = username.trim();
  if (password?.trim()) {
    process.env.PROTHEUS_REST_PASSWORD = password.trim();
  }
}

interface CredencialStatusRow {
  username: string;
  baseUrl: string;
  clientId: string;
  atualizadoEm: Date;
}

function mapCredencialStatus(cred: CredencialStatusRow | null) {
  if (cred) {
    return {
      configurado: true,
      username: cred.username,
      baseUrl: cred.baseUrl,
      clientId: cred.clientId,
      atualizadoEm: cred.atualizadoEm,
    };
  }
  const envUser = process.env.PROTHEUS_REST_USER ?? null;
  const configurado = Boolean(envUser && process.env.PROTHEUS_REST_PASSWORD);
  return {
    configurado,
    username: envUser,
    baseUrl: process.env.PROTHEUS_REST_BASE_URL ?? "",
    clientId: process.env.PROTHEUS_REST_CLIENT_ID ?? null,
    atualizadoEm: null,
  };
}

export async function getCredenciaisStatus(empresaId: string) {
  try {
    const cred = await prisma.protheusCredencial.findUnique({
      where: { empresaId },
      select: { username: true, baseUrl: true, clientId: true, atualizadoEm: true },
    });
    return mapCredencialStatus(cred);
  } catch (error) {
    logApiError("Erro ao consultar status de credenciais Protheus", error);
    throw error;
  }
}

async function salvarTokenManual(empresaId: string, token: string, baseUrl: string) {
  const expDate = parseJwtExpiry(token);
  const expiresAt = expDate && expDate.getTime() > Date.now() ? expDate : new Date(Date.now() + 86400 * 1000);

  await prisma.protheusCredencial.update({
    where: { empresaId },
    data: { accessToken: token, expiresAt },
  });

  process.env.PROTHEUS_REST_ACCESS_TOKEN = token;
  setMemoryToken(token, expiresAt);
  logIntegration("Token manual salvo e sincronizado com sucesso", { empresaId });
  return { success: true, tokenPreview: `${token.slice(0, 10)}...` };
}

async function obterOuManterToken(empresaId: string) {
  try {
    const novoToken = await protheusTokenProvider.getValidToken(empresaId, true);
    logIntegration("Token gerado com sucesso apos salvar credenciais", { empresaId });
    return { success: true, tokenPreview: `${novoToken.slice(0, 10)}...` };
  } catch (tokenErr) {
    const existing = process.env.PROTHEUS_REST_ACCESS_TOKEN;
    if (existing && !existing.includes("sig_totvs_fwjwt_auto_renew")) {
      const expiresAt = new Date(Date.now() + 86400 * 1000);
      await prisma.protheusCredencial.update({
        where: { empresaId },
        data: { accessToken: existing, expiresAt },
      });
      setMemoryToken(existing, expiresAt);
      logIntegration("Protheus remoto inacessivel. Token existente mantido ativo", { empresaId });
      return {
        success: true,
        tokenPreview: `${existing.slice(0, 10)}...`,
        aviso: "Credenciais salvas. Token Protheus existente foi mantido ativo.",
      };
    }
    throw tokenErr;
  }
}

function parseCredenciaisInput(input: CredenciaisInput) {
  const username = input.username?.trim() || process.env.PROTHEUS_REST_USER || "admin";
  const password = input.password?.trim() || "";
  const tokenInput = input.accessToken?.trim();
  if (!tokenInput && !password) {
    throw new Error("Informe a senha ou o Token de acesso do Protheus.");
  }
  return { username, password, tokenInput };
}

export async function salvarCredenciaisProtheus(empresaId: string, input: CredenciaisInput) {
  const { username, password, tokenInput } = parseCredenciaisInput(input);
  const resolved = resolveInput({ ...input, username, password });

  try {
    await upsertCredencial(empresaId, username, resolved);
    syncEnv(username, password);

    logIntegration("Credenciais Protheus salvas. Processando token...", { empresaId, username });

    if (tokenInput) {
      return await salvarTokenManual(empresaId, tokenInput, resolved.baseUrl);
    }

    return await obterOuManterToken(empresaId);
  } catch (error) {
    logApiError("Erro ao salvar credenciais ou validar com Protheus", error);
    throw error;
  }
}

async function criarCredencialPadrao(empresaId: string) {
  const defaultUser = process.env.PROTHEUS_REST_USER || "admin";
  const defaultPass = process.env.PROTHEUS_REST_PASSWORD || "LC1sysC0nt@!2026adm!@";
  const resolved = resolveInput({ username: defaultUser, password: defaultPass });
  await upsertCredencial(empresaId, defaultUser, resolved);
}

function ativarTokenEmMemoria(cred: { accessToken?: string | null; expiresAt?: Date | null } | null) {
  if (!cred?.accessToken || cred.accessToken.includes("sig_totvs_fwjwt_auto_renew")) return;
  const exp = cred.expiresAt || new Date(Date.now() + 86400 * 1000);
  setMemoryToken(cred.accessToken, exp);
  process.env.PROTHEUS_REST_ACCESS_TOKEN = cred.accessToken;
}

export async function garantirCredenciaisIniciais(empresaId: string): Promise<void> {
  try {
    const credDelegate = (prisma as unknown as { protheusCredencial?: typeof prisma.protheusCredencial }).protheusCredencial;
    if (!credDelegate?.findUnique) return;

    let cred = await credDelegate.findUnique({
      where: { empresaId },
      select: { accessToken: true, expiresAt: true, username: true },
    });
    if (!cred) {
      await criarCredencialPadrao(empresaId);
      cred = await credDelegate.findUnique({
        where: { empresaId },
        select: { accessToken: true, expiresAt: true, username: true },
      });
    }

    ativarTokenEmMemoria(cred);
    await protheusTokenProvider.getValidToken(empresaId);
  } catch (error) {
    logApiError("Aviso ao garantir token inicial da empresa", error);
  }
}