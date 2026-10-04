import { prisma } from "@/lib/db/prisma-client";

export async function findEmpresaAtual(empresaId: string) {
  return prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nome: true,
      cnpj: true,
      filiais: {
        select: { id: true, nome: true, cnpj: true },
      },
    },
  });
}

export type EmpresaAtual = NonNullable<Awaited<ReturnType<typeof findEmpresaAtual>>>;

export async function updateEmpresaDados(
  empresaId: string,
  body: { nome?: string; cnpj?: string }
) {
  return prisma.empresa.update({
    where: { id: empresaId },
    data: {
      ...(body.nome ? { nome: body.nome } : {}),
      ...(body.cnpj ? { cnpj: body.cnpj } : {}),
    },
    select: { id: true, nome: true, cnpj: true },
  });
}
