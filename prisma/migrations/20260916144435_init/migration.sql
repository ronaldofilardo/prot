-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "loja" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faturamento" (
    "id" TEXT NOT NULL,
    "filial" TEXT NOT NULL,
    "numeroNota" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "valorTotal" DECIMAL(15,2) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Faturamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaReceber" (
    "id" TEXT NOT NULL,
    "filial" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "parcela" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "ContaReceber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Baixa" (
    "id" TEXT NOT NULL,
    "filial" TEXT NOT NULL,
    "filialBaixa" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "parcela" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valorBaixa" DECIMAL(15,2) NOT NULL,
    "dataBaixa" TIMESTAMP(3) NOT NULL,
    "contaReceberId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Baixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigo_loja_empresaId_key" ON "Cliente"("codigo", "loja", "empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Faturamento_filial_numeroNota_empresaId_key" ON "Faturamento"("filial", "numeroNota", "empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "ContaReceber_filial_prefixo_numero_parcela_empresaId_key" ON "ContaReceber"("filial", "prefixo", "numero", "parcela", "empresaId");

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faturamento" ADD CONSTRAINT "Faturamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faturamento" ADD CONSTRAINT "Faturamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baixa" ADD CONSTRAINT "Baixa_contaReceberId_fkey" FOREIGN KEY ("contaReceberId") REFERENCES "ContaReceber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baixa" ADD CONSTRAINT "Baixa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
