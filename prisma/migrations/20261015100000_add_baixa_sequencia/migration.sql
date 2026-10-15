-- AlterTable
ALTER TABLE "Baixa" ADD COLUMN "sequencia" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Baixa_contaReceberId_sequencia_dataBaixa_key" ON "Baixa"("contaReceberId", "sequencia", "dataBaixa");
