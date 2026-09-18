import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function lerCSV(nomeArquivo: string) {
  const caminho = join(process.cwd(), "mocks", "protheus", nomeArquivo);
  let conteudo = readFileSync(caminho, "utf-8");

  // Remove o BOM (Byte Order Mark) invisível do Windows
  conteudo = conteudo.replace(/^\uFEFF/, "");

  const dados = parse(conteudo, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    delimiter: ";", // 🎯 AQUI ESTÁ A CORREÇÃO PARA O EXCEL BRASILEIRO
  }) as Record<string, string>[];

  if (dados.length > 0) {
    console.log(`🔍 Colunas lidas de ${nomeArquivo}:`, Object.keys(dados[0]));
  } else {
    console.warn(`⚠️ Arquivo ${nomeArquivo} está vazio ou mal formatado.`);
  }

  return dados;
}

function parseDataProtheus(dataStr: string): Date {
  if (!dataStr || dataStr.length !== 8) return new Date();
  const ano = parseInt(dataStr.substring(0, 4));
  const mes = parseInt(dataStr.substring(4, 6)) - 1;
  const dia = parseInt(dataStr.substring(6, 8));
  return new Date(ano, mes, dia);
}

async function main() {
  // 🧹 LIMPEZA DO BANCO (Para poder rodar o seed várias vezes sem duplicar)
  console.log("🧹 Limpando banco de dados...");
  await prisma.syncLog.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.baixa.deleteMany();
  await prisma.contaReceber.deleteMany();
  await prisma.faturamento.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.empresa.deleteMany();
  await prisma.tenant.deleteMany();
  console.log("✅ Banco limpo!\n");

  console.log("🌱 Iniciando seed...");

  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant-demo" },
    update: {},
    create: { id: "tenant-demo", nome: "Empresa Demo LTDA" },
  });

  const empresa = await prisma.empresa.upsert({
    where: { id: "empresa-01" },
    update: {},
    create: {
      id: "empresa-01",
      nome: "Filial 01 - Matriz",
      tenantId: tenant.id,
    },
  });

  console.log("👤 Criando usuário de acesso (login real via Auth.js)...");
  const senhaDemo = process.env.SEED_DEMO_PASSWORD || "TrocarNoPrimeiroAcesso!123";
  await prisma.usuario.create({
    data: {
      email: "gestor@empresademo.com.br",
      senhaHash: await hash(senhaDemo, 10),
      nome: "Gestor Demo",
      empresaId: empresa.id,
    },
  });
  console.log(`   -> login: gestor@empresademo.com.br / senha: ${senhaDemo}`);

  console.log("📥 Importando clientes (SA1)...");
  const sa1 = lerCSV("SA1.csv");
  for (const row of sa1) {
    if (row.D_E_L_E_T_ === "*") continue;
    if (!row.A1_COD || !row.A1_LOJA) continue;

    await prisma.cliente.upsert({
      where: {
        codigo_loja_empresaId: {
          codigo: row.A1_COD.trim(),
          loja: row.A1_LOJA.trim(),
          empresaId: empresa.id,
        },
      },
      update: {},
      create: {
        codigo: row.A1_COD.trim(),
        loja: row.A1_LOJA.trim(),
        nome: row.A1_NOME?.trim() || "Sem Nome",
        cidade: row.A1_MUN?.trim() || "",
        estado: row.A1_EST?.trim() || "",
        ativo: true,
        empresaId: empresa.id,
      },
    });
  }

  console.log("📥 Importando faturamentos (SF2)...");
  const sf2 = lerCSV("SF2.csv");
  for (const row of sf2) {
    if (row.D_E_L_E_T_ === "*") continue;
    if (!row.F2_CLIENTE || !row.F2_LOJA) continue;

    const cliente = await prisma.cliente.findUnique({
      where: {
        codigo_loja_empresaId: {
          codigo: row.F2_CLIENTE.trim(),
          loja: row.F2_LOJA.trim(),
          empresaId: empresa.id,
        },
      },
    });

    if (!cliente) continue;

    await prisma.faturamento.upsert({
      where: {
        filial_numeroNota_empresaId: {
          filial: row.F2_FILIAL.trim(),
          numeroNota: row.F2_DOC.trim(),
          empresaId: empresa.id,
        },
      },
      update: {},
      create: {
        filial: row.F2_FILIAL.trim(),
        numeroNota: row.F2_DOC.trim(),
        dataEmissao: parseDataProtheus(row.F2_EMISSAO),
        valorTotal: parseFloat(row.F2_VALOR) || 0,
        clienteId: cliente.id,
        empresaId: empresa.id,
      },
    });
  }

  console.log("📥 Importando contas a receber (SE1)...");
  const se1 = lerCSV("SE1.csv");
  for (const row of se1) {
    if (row.D_E_L_E_T_ === "*") continue;
    if (!row.E1_CLIENTE || !row.E1_LOJA) continue;

    const cliente = await prisma.cliente.findUnique({
      where: {
        codigo_loja_empresaId: {
          codigo: row.E1_CLIENTE.trim(),
          loja: row.E1_LOJA.trim(),
          empresaId: empresa.id,
        },
      },
    });

    if (!cliente) continue;

    await prisma.contaReceber.upsert({
      where: {
        filial_prefixo_numero_parcela_empresaId: {
          filial: row.E1_FILIAL.trim(),
          prefixo: row.E1_PREFIXO.trim(),
          numero: row.E1_NUM.trim(),
          parcela: row.E1_PARCELA.trim(),
          empresaId: empresa.id,
        },
      },
      update: {},
      create: {
        filial: row.E1_FILIAL.trim(),
        prefixo: row.E1_PREFIXO.trim(),
        numero: row.E1_NUM.trim(),
        parcela: row.E1_PARCELA.trim(),
        tipo: row.E1_TIPO.trim(),
        dataEmissao: parseDataProtheus(row.E1_EMISSAO),
        vencimento: parseDataProtheus(row.E1_VENCTO),
        valor: parseFloat(row.E1_VALOR) || 0,
        clienteId: cliente.id,
        empresaId: empresa.id,
      },
    });
  }

  console.log("📥 Importando baixas (SE5)...");
  const se5 = lerCSV("SE5.csv");
  for (const row of se5) {
    if (row.D_E_L_E_T_ === "*") continue;

    const contaReceber = await prisma.contaReceber.findUnique({
      where: {
        filial_prefixo_numero_parcela_empresaId: {
          filial: row.E5_FILIAL.trim(),
          prefixo: row.E5_PREFIXO.trim(),
          numero: row.E5_NUM.trim(),
          parcela: row.E5_PARCELA.trim(),
          empresaId: empresa.id,
        },
      },
    });

    if (!contaReceber) continue;

    await prisma.baixa.create({
      data: {
        filial: row.E5_FILIAL.trim(),
        filialBaixa: row.E5_FILBAI.trim(),
        prefixo: row.E5_PREFIXO.trim(),
        numero: row.E5_NUM.trim(),
        parcela: row.E5_PARCELA.trim(),
        tipo: row.E5_TIPO.trim(),
        valorBaixa: parseFloat(row.E5_VALOR) || 0,
        dataBaixa: parseDataProtheus(row.E5_BAIXA),
        contaReceberId: contaReceber.id,
        empresaId: empresa.id,
      },
    });
  }

  // ── Teste do pipeline canônico (modelo canônico + adapter) ──
  console.log("\n🔄 Testando pipeline canônico (adapter Protheus → Canônico)...");
  const {
    csvRowToCanonicalCliente,
    csvRowToCanonicalFaturamento,
    csvRowToCanonicalContaReceber,
    csvRowToCanonicalBaixa,
  } = await import("../src/lib/integration/protheus-adapter");

  const canonicalClientes = sa1
    .filter((r) => r.D_E_L_E_T_ !== "*")
    .map((r) => csvRowToCanonicalCliente(r, empresa.id));
  console.log(`   → ${canonicalClientes.length} clientes convertidos para formato canônico`);

  const canonicalFats = sf2
    .filter((r) => r.D_E_L_E_T_ !== "*")
    .map((r) => csvRowToCanonicalFaturamento(r, empresa.id));
  console.log(`   → ${canonicalFats.length} faturamentos convertidos para formato canônico`);

  const canonicalCR = se1
    .filter((r) => r.D_E_L_E_T_ !== "*")
    .map((r) => csvRowToCanonicalContaReceber(r, empresa.id));
  console.log(`   → ${canonicalCR.length} contas a receber convertidas para formato canônico`);

  const canonicalBX = se5
    .filter((r) => r.D_E_L_E_T_ !== "*")
    .map((r) => csvRowToCanonicalBaixa(r, empresa.id));
  console.log(`   → ${canonicalBX.length} baixas convertidas para formato canônico`);

  console.log("   ✅ Pipeline canônico funcionando — dados prontos para /api/ingest");

  console.log("\n✅ Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
