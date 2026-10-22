-- AlterTable
ALTER TABLE "Faturamento" ADD COLUMN "serie" TEXT NOT NULL DEFAULT '';

-- DropIndex
DROP INDEX IF EXISTS "Faturamento_filial_numeroNota_empresaId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Faturamento_filial_numeroNota_serie_empresaId_key" ON "Faturamento"("filial", "numeroNota", "serie", "empresaId");

-- DropIndex
DROP INDEX IF EXISTS "ContaReceber_filial_prefixo_numero_parcela_empresaId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ContaReceber_filial_prefixo_numero_parcela_tipo_empresaId_key" ON "ContaReceber"("filial", "prefixo", "numero", "parcela", "tipo", "empresaId");
