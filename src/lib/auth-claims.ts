import { compare } from "bcryptjs";
import { prisma } from "@/lib/db/prisma-client";
import { logAuth, logApiError } from "@/lib/utils/logger";

interface CredenciaisValidas {
  email: string;
  senha: string;
}

export interface UsuarioAutorizado {
  id: string;
  email: string;
  name: string;
  empresaId: string;
  tenantId: string;
}

function extrairCredenciais(credentials: Record<string, string> | undefined): CredenciaisValidas | null {
  const email = credentials?.email?.trim().toLowerCase();
  const senha = credentials?.password || credentials?.senha;
  if (!email || !senha) return null;
  return { email, senha };
}

async function validarCredenciais(email: string, senha: string): Promise<UsuarioAutorizado | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { empresa: true },
  });

  if (!usuario || !usuario.ativo) {
    logAuth("Usuario nao encontrado ou inativo", { email });
    return null;
  }

  const senhaValida = await compare(senha, usuario.senhaHash);
  if (!senhaValida) {
    logAuth("Senha incorreta para usuario", { email });
    return null;
  }

  logAuth("Autenticacao autorizada com sucesso", { usuarioId: usuario.id });

  return {
    id: usuario.id,
    email: usuario.email,
    name: usuario.nome,
    empresaId: usuario.empresaId,
    tenantId: usuario.empresa.tenantId,
  };
}

export async function authorizeCredentials(
  credentials: Record<string, string> | undefined
): Promise<UsuarioAutorizado | null> {
  try {
    const creds = extrairCredenciais(credentials);
    if (!creds) {
      logAuth("Tentativa de login com credenciais incompletas");
      return null;
    }
    return await validarCredenciais(creds.email, creds.senha);
  } catch (error) {
    logApiError("Erro ao autorizar credenciais", error);
    return null;
  }
}
