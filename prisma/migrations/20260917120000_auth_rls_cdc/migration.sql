-- 1) Usuário do SaaS (necessário para ativar autenticação real)
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) Colunas de controle de sincronização (CDC) para o Agente Protheus
ALTER TABLE "Cliente" ADD COLUMN "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Faturamento" ADD COLUMN "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ContaReceber" ADD COLUMN "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Baixa" ADD COLUMN "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Cliente_sincronizadoEm_idx" ON "Cliente"("sincronizadoEm");
CREATE INDEX "Faturamento_sincronizadoEm_idx" ON "Faturamento"("sincronizadoEm");
CREATE INDEX "ContaReceber_sincronizadoEm_idx" ON "ContaReceber"("sincronizadoEm");
CREATE INDEX "Baixa_sincronizadoEm_idx" ON "Baixa"("sincronizadoEm");

-- 3) Row Level Security por empresa (defesa em profundidade contra bug de
-- filtro na aplicação — ver src/app/api/dashboard/route.ts, que hoje não
-- filtrava por tenant/empresa).
--
-- A aplicação deve setar, por transação/conexão:
--   SELECT set_config('app.current_empresa_id', '<empresaId>', true);
-- (ver src/lib/db/prisma-client.ts)

ALTER TABLE "Cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Faturamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContaReceber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Baixa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresa_isolation ON "Cliente"
    USING ("empresaId" = current_setting('app.current_empresa_id', true));

CREATE POLICY empresa_isolation ON "Faturamento"
    USING ("empresaId" = current_setting('app.current_empresa_id', true));

CREATE POLICY empresa_isolation ON "ContaReceber"
    USING ("empresaId" = current_setting('app.current_empresa_id', true));

CREATE POLICY empresa_isolation ON "Baixa"
    USING ("empresaId" = current_setting('app.current_empresa_id', true));

CREATE POLICY empresa_isolation ON "Usuario"
    USING ("empresaId" = current_setting('app.current_empresa_id', true));

-- Papel usado pelo Agente de Sincronização do Protheus: grava dados mas
-- não fica sujeito à policy de leitura por sessão de usuário final.
-- (Rode manualmente com um usuário de banco distinto da app; a Prisma
-- app connection deve continuar usando um role restrito.)
-- CREATE ROLE protheus_sync_agent BYPASSRLS LOGIN PASSWORD '<definir-em-producao>';
