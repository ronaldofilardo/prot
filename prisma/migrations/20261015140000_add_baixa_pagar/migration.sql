-- CreateTable
CREATE TABLE "BaixaPagar" (
    "id" TEXT NOT NULL,
    "filial" TEXT NOT NULL,
    "filialBaixa" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "parcela" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "sequencia" TEXT,
    "valorBaixa" DECIMAL(15,2) NOT NULL,
    "dataBaixa" TIMESTAMP(3) NOT NULL,
    "contaPagarId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaixaPagar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BaixaPagar_empresaId_dataBaixa_idx" ON "BaixaPagar"("empresaId", "dataBaixa");

-- CreateIndex
CREATE INDEX "BaixaPagar_filial_numero_idx" ON "BaixaPagar"("filial", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "BaixaPagar_contaPagarId_sequencia_dataBaixa_key" ON "BaixaPagar"("contaPagarId", "sequencia", "dataBaixa");

-- AddForeignKey
ALTER TABLE "BaixaPagar" ADD CONSTRAINT "BaixaPagar_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "ContaPagar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaixaPagar" ADD CONSTRAINT "BaixaPagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS
ALTER TABLE "BaixaPagar" ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresa_isolation ON "BaixaPagar"
    USING ("empresaId" = current_setting('app.current_empresa_id', true));
