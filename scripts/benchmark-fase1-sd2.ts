import { prisma } from "@/lib/db/prisma-client";
import { syncItensVenda } from "@/lib/integration/_internals/sync-itens-venda";
import type { CanonicalSaleItem } from "@/lib/integration/canonical";

async function runBenchmark() {
  console.log("=== INICIANDO BENCHMARK FASE 1: 5.000 LINHAS DE SD2 ===");

  // Encontra ou cria uma empresa de teste para isolamento seguro
  let empresa = await prisma.empresa.findFirst({ where: { nome: "Empresa Benchmark" } });
  if (!empresa) {
    const tenant = await prisma.tenant.findFirst() || await prisma.tenant.create({ data: { nome: "Tenant Benchmark" } });
    empresa = await prisma.empresa.create({
      data: { nome: "Empresa Benchmark", tenantId: tenant.id },
    });
  }

  // Cria um cliente de teste para a empresa
  const cliente = await prisma.cliente.upsert({
    where: { codigo_loja_empresaId: { codigo: "BENCH1", loja: "01", empresaId: empresa.id } },
    update: {},
    create: { codigo: "BENCH1", loja: "01", nome: "Cliente Benchmark", cidade: "SP", estado: "SP", empresaId: empresa.id },
  });

  const TOTAL = 5000;
  console.log(`Gerando ${TOTAL} linhas sintéticas de SD2...`);
  const itens: CanonicalSaleItem[] = [];
  for (let i = 1; i <= TOTAL; i++) {
    const numDoc = String(Math.floor(i / 10) + 1).padStart(6, "0");
    const numItem = String((i % 10) + 1).padStart(2, "0");
    itens.push({
      externalId: `${empresa.id}-IT-01-${numDoc}-1-BENCH1-01-${numItem}`,
      company: empresa.id,
      branch: "01",
      documentNumber: numDoc,
      series: "1",
      item: numItem,
      productCode: `PROD-${(i % 50) + 1}`,
      issueDate: "2026-01-15T00:00:00.000Z",
      quantity: 10,
      totalAmount: 1000,
      costAmount: 600,
      cfop: "5102",
      tes: "501",
      type: "N",
      returnedQuantity: 0,
      returnedAmount: 0,
      partyExternalId: `${empresa.id}-CLI-BENCH1-01`,
      updatedAt: "2026-01-15T00:00:00.000Z",
    });
  }

  // 1ª Execução: Inserção em lote (chunks de 500)
  const inicio1 = Date.now();
  const res1 = await syncItensVenda(prisma, empresa.id, itens);
  const duracao1 = (Date.now() - inicio1) / 1000;
  console.log(`1ª Execução concluída em ${duracao1.toFixed(2)}s:`, res1);

  // 2ª Execução com os mesmos dados: Idempotência (deve dar 0 criados e 0 atualizados)
  const inicio2 = Date.now();
  const res2 = await syncItensVenda(prisma, empresa.id, itens);
  const duracao2 = (Date.now() - inicio2) / 1000;
  console.log(`2ª Execução (idempotente) concluída em ${duracao2.toFixed(2)}s:`, res2);

  // Limpeza dos dados de benchmark
  console.log("Limpando registros de benchmark...");
  await prisma.itemVenda.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.cliente.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.empresa.delete({ where: { id: empresa.id } });

  console.log("\n=== RESULTADO DO ACEITE DA FASE 1 ===");
  console.log(`Critério 1: 5.000 linhas gravam em < 15s? ${duracao1 < 15 ? "APROVADO (" + duracao1.toFixed(2) + "s)" : "REPROVADO (" + duracao1.toFixed(2) + "s)"}`);
  console.log(`Critério 2: 2ª execução com 0 criados e 0 atualizados? ${res2.criados === 0 && res2.atualizados === 0 ? "APROVADO (0 criados, 0 atualizados)" : "REPROVADO"}`);
}

runBenchmark().catch(console.error).finally(() => prisma.$disconnect());
