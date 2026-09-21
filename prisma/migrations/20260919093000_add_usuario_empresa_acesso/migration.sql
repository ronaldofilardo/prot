-- CreateTable
CREATE TABLE "UsuarioEmpresaAcesso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioEmpresaAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioEmpresaAcesso_usuarioId_empresaId_key" ON "UsuarioEmpresaAcesso"("usuarioId", "empresaId");

-- CreateIndex
CREATE INDEX "UsuarioEmpresaAcesso_usuarioId_idx" ON "UsuarioEmpresaAcesso"("usuarioId");

-- AddForeignKey
ALTER TABLE "UsuarioEmpresaAcesso" ADD CONSTRAINT "UsuarioEmpresaAcesso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioEmpresaAcesso" ADD CONSTRAINT "UsuarioEmpresaAcesso_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Nota: "UsuarioEmpresaAcesso" não tem RLS habilitada de propósito — é
-- metadado de permissão (quais empresas o usuário pode consultar), lido
-- fora da transação com `withEmpresaRLS` para decidir, ANTES de setar
-- app.current_empresa_id, quais empresaId's entram na consulta.
