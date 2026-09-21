-- DropForeignKey
ALTER TABLE "UsuarioEmpresaAcesso" DROP CONSTRAINT "UsuarioEmpresaAcesso_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "UsuarioEmpresaAcesso" DROP CONSTRAINT "UsuarioEmpresaAcesso_usuarioId_fkey";

-- AddForeignKey
ALTER TABLE "UsuarioEmpresaAcesso" ADD CONSTRAINT "UsuarioEmpresaAcesso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioEmpresaAcesso" ADD CONSTRAINT "UsuarioEmpresaAcesso_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
