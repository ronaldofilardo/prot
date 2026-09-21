-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "matrizId" TEXT;

-- CreateIndex
CREATE INDEX "Empresa_matrizId_idx" ON "Empresa"("matrizId");

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_matrizId_fkey" FOREIGN KEY ("matrizId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
