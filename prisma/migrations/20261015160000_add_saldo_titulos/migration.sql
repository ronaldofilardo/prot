-- AlterTable
ALTER TABLE "ContaReceber" ADD COLUMN "saldo" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ContaPagar" ADD COLUMN "saldo" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Backfill: inicializar saldo com o valor do título nos registros existentes
UPDATE "ContaReceber" SET "saldo" = "valor" WHERE "saldo" = 0;
UPDATE "ContaPagar" SET "saldo" = "valor" WHERE "saldo" = 0;
