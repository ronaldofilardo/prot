import { prisma } from "@/lib/db/prisma-client";
import { encryptText } from "@/lib/security/crypto-vault";
import { protheusTokenProvider } from "@/lib/integration/protheus-token-provider";
import { logApiError, logIntegration } from "@/lib/utils/logger";

interface CredenciaisInput {
  username: string;
  password: string;
  baseUrl?: string;
  clientId?: string;
}

function resolveInput(input: CredenciaisInput) {
  const baseUrl = input.baseUrl?.trim() || process.env.PROTHEUS_REST_BASE_URL || "https://lc1contadores141403.protheus.cloudtotvs.com.br:1656";
  const clientId = input.clientId?.trim() || process.env.PROTHEUS_REST_CLIENT_ID || input.username.trim();
  const passwordEnc = encryptText(input.password.trim());
  return { baseUrl, clientId, passwordEnc };
}

async function upsertCredencial(empresaId: string, username: string, data: ReturnType<typeof resolveInput>) {
  await prisma.protheusCredencial.upsert({
    where: { empresaId },
    create: { empresaId, username: username.trim(), ...data },
    update: { ...data, username: username.trim() },
  });
}

function syncEnv(username: string, password: string) {
  process.env.PROTHEUS_REST_USER = username.trim();
  process.env.PROTHEUS_REST_PASSWORD = password.trim();
}

export async function getCredenciaisStatus(empresaId: string) {
  try {
    const cred = await prisma.protheusCredencial.findUnique({
      where: { empresaId },
      select: { username: true, baseUrl: true, clientId: true, atualizadoEm: true },
    });

    const envUser = process.env.PROTHEUS_REST_USER;
    const envBase = process.env.PROTHEUS_REST_BASE_URL;

    return {
      configurado: Boolean(cred || (envUser && process.env.PROTHEUS_REST_PASSWORD)),
      username: cred?.username || envUser || null,
      baseUrl: cred?.baseUrl || envBase || "",
      clientId: cred?.clientId || process.env.PROTHEUS_REST_CLIENT_ID || null,
      atualizadoEm: cred?.atualizadoEm || null,
    };
  } catch (error) {
    logApiError("Erro ao consultar status de credenciais Protheus", error);
    throw error;
  }
}

export async function salvarCredenciaisProtheus(empresaId: string, input: CredenciaisInput) {
  const { username, password } = input;
  if (!username?.trim() || !password?.trim()) {
    throw new Error("Usuário e senha são obrigatórios");
  }

  const resolved = resolveInput(input);

  try {
    await upsertCredencial(empresaId, username, resolved);
    syncEnv(username, password);

    logIntegration("Credenciais Protheus salvas. Tentando gerar token sob demanda...", { empresaId, username });

    const novoToken = await protheusTokenProvider.getValidToken(empresaId, true);

    logIntegration("Token gerado com sucesso apos salvar credenciais", { empresaId });
    return { success: true, tokenPreview: `${novoToken.slice(0, 10)}...` };
  } catch (error) {
    logApiError("Erro ao salvar credenciais ou validar com Protheus", error);
    throw error;
  }
}