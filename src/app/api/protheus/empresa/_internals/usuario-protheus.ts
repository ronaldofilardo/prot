import { prisma } from "@/lib/db/prisma-client";

/**
 * Usuario Protheus cujas filiais devem ser exibidas: o `username` salvo em
 * ProtheusCredencial (login usado para obter o token OAuth2). Sem credencial
 * no banco, cai para PROTHEUS_REST_USER (modo .env).
 */
export async function resolveUsuarioProtheus(empresaId: string): Promise<string | null> {
  try {
    const delegate = (prisma as unknown as {
      protheusCredencial?: {
        findUnique: (args: { where: { empresaId: string }; select: { username: true } }) => Promise<{ username: string } | null>;
      };
    }).protheusCredencial;
    const cred = delegate ? await delegate.findUnique({ where: { empresaId }, select: { username: true } }) : null;
    const username = cred?.username?.trim();
    if (username) return username;
  } catch {
    // tabela ainda inexistente: usa o fallback abaixo
  }
  return process.env.PROTHEUS_REST_USER?.trim() || null;
}
