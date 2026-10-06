import { withEmpresaRLS } from "@/lib/db/prisma-client";
import type { PrismaClient, SaldoContabil } from "@prisma/client";

export async function carregarSaldos(
  idsConsulta: string[],
  filters: { exercicio: string; filial: string }
): Promise<SaldoContabil[]> {
  const resultados = await Promise.all(
    idsConsulta.map((id) =>
      withEmpresaRLS(id, (tx) =>
        (tx as PrismaClient).saldoContabil.findMany({
          where: {
            empresaId: id,
            exercicio: filters.exercicio,
            ...(filters.filial ? { filial: filters.filial } : {}),
          },
          orderBy: [
            { filial: "asc" },
            { conta: "asc" },
            { competencia: "asc" },
          ],
        })
      )
    )
  );
  return resultados.flat();
}
