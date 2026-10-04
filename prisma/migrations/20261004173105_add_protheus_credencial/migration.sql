-- CreateTable
CREATE TABLE "ProtheusCredencial" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "accessToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtheusCredencial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProtheusCredencial_empresaId_key" ON "ProtheusCredencial"("empresaId");

-- CreateIndex
CREATE INDEX "ProtheusCredencial_empresaId_idx" ON "ProtheusCredencial"("empresaId");

-- AddForeignKey
ALTER TABLE "ProtheusCredencial" ADD CONSTRAINT "ProtheusCredencial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
