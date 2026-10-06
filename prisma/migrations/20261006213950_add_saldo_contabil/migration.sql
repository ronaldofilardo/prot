-- CreateTable
CREATE TABLE "SaldoContabil" (
    "id" TEXT NOT NULL,
    "filial" TEXT NOT NULL,
    "conta" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "exercicio" TEXT NOT NULL,
    "saldoAnterior" DECIMAL(15,2) NOT NULL,
    "debitos" DECIMAL(15,2) NOT NULL,
    "creditos" DECIMAL(15,2) NOT NULL,
    "saldoAtual" DECIMAL(15,2) NOT NULL,
    "empresaId" TEXT NOT NULL,
    "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaldoContabil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaldoContabil_empresaId_competencia_idx" ON "SaldoContabil"("empresaId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "SaldoContabil_filial_conta_competencia_empresaId_key" ON "SaldoContabil"("filial", "conta", "competencia", "empresaId");

-- AddForeignKey
ALTER TABLE "SaldoContabil" ADD CONSTRAINT "SaldoContabil_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS
ALTER TABLE "SaldoContabil" ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresa_isolation ON "SaldoContabil"
    USING ("empresaId" = current_setting('app.current_empresa_id', true));
