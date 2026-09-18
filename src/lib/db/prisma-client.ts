import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Executa `fn` dentro de uma transação com a policy de RLS
 * (`empresa_isolation`, ver migration 20260917120000_auth_rls_cdc) ativa
 * para a empresa da sessão. Defesa em profundidade: mesmo que uma query
 * dentro de `fn` esqueça o `where: { empresaId }`, o Postgres ainda
 * bloqueia o acesso a linhas de outra empresa.
 */
export async function withEmpresaRLS<T>(
  empresaId: string,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_empresa_id', $1, true)`,
      empresaId
    );
    return fn(tx as unknown as PrismaClient);
  });
}

export default prisma;
