-- CreateTable
CREATE TABLE "ContaPagar" (
    "id" TEXT NOT NULL,
    "filial" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "parcela" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fornecedorCodigo" TEXT NOT NULL,
    "fornecedorLoja" TEXT NOT NULL,
    "fornecedorNome" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "empresaId" TEXT NOT NULL,
    "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaPagar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContaPagar_empresaId_dataEmissao_idx" ON "ContaPagar"("empresaId", "dataEmissao");

-- CreateIndex
CREATE INDEX "ContaPagar_empresaId_vencimento_idx" ON "ContaPagar"("empresaId", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "ContaPagar_filial_prefixo_numero_parcela_tipo_fornecedorCodigo_fornecedorLoja_empresaId_key" ON "ContaPagar"("filial", "prefixo", "numero", "parcela", "tipo", "fornecedorCodigo", "fornecedorLoja", "empresaId");

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS
ALTER TABLE "ContaPagar" ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresa_isolation ON "ContaPagar"
    USING ("empresaId" = current_setting('app.current_empresa_id', true));
