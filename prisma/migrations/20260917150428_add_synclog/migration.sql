-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "operacao" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "categoriaErro" TEXT,
    "mensagem" TEXT,
    "payloadEnviado" JSONB,
    "tentativas" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncLog_empresaId_entidade_criadoEm_idx" ON "SyncLog"("empresaId", "entidade", "criadoEm");

-- CreateIndex
CREATE INDEX "SyncLog_status_categoriaErro_idx" ON "SyncLog"("status", "categoriaErro");

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
