-- CreateTable
CREATE TABLE "ItemVenda" (
    "id" TEXT NOT NULL,
    "filial" TEXT NOT NULL,
    "numeroNota" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "quantidade" DECIMAL(15,4) NOT NULL,
    "valorTotal" DECIMAL(15,2) NOT NULL,
    "custo" DECIMAL(15,2) NOT NULL,
    "cfop" TEXT NOT NULL,
    "tes" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "qtdDevolvida" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "valorDevolvido" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "clienteId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemVenda_empresaId_dataEmissao_idx" ON "ItemVenda"("empresaId", "dataEmissao");

-- CreateIndex
CREATE INDEX "ItemVenda_empresaId_clienteId_idx" ON "ItemVenda"("empresaId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemVenda_filial_numeroNota_serie_clienteId_item_empresaId_key" ON "ItemVenda"("filial", "numeroNota", "serie", "clienteId", "item", "empresaId");

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS
ALTER TABLE "ItemVenda" ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresa_isolation ON "ItemVenda"
    USING ("empresaId" = current_setting('app.current_empresa_id', true));
