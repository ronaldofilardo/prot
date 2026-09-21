import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db/prisma-client";
import { logAuth, logApiError } from "@/lib/utils/logger";

// Autenticação ativada e ligada ao tenant/empresa do usuário logado.
// (Antes: providers: [] — qualquer acesso ao /dashboard funcionava sem
// login e nenhuma query filtrava por empresa. Ver src/app/api/dashboard/route.ts.)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        try {
          const creds = credentials as Record<string, string> | undefined;
          const emailInput = creds?.email?.trim().toLowerCase();
          const senhaInput = creds?.password || creds?.senha;

          if (!emailInput || !senhaInput) {
            logAuth("Tentativa de login com credenciais incompletas");
            return null;
          }

          const usuario = await prisma.usuario.findUnique({
            where: { email: emailInput },
            include: { empresa: true },
          });

          if (!usuario || !usuario.ativo) {
            logAuth("Usuario nao encontrado ou inativo", { email: emailInput });
            return null;
          }

          const senhaValida = await compare(senhaInput, usuario.senhaHash);
          if (!senhaValida) {
            logAuth("Senha incorreta para usuario", { email: emailInput });
            return null;
          }

          logAuth("Autenticacao autorizada com sucesso", { usuarioId: usuario.id });

          return {
            id: usuario.id,
            email: usuario.email,
            name: usuario.nome,
            empresaId: usuario.empresaId,
            tenantId: usuario.empresa.tenantId,
          };
        } catch (error) {
          logApiError("Erro ao autorizar credenciais", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8h
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as unknown as { id?: string; empresaId?: string; tenantId?: string };
        token.usuarioId = customUser.id;
        token.empresaId = customUser.empresaId;
        token.tenantId = customUser.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sUser = session.user as typeof session.user & { usuarioId?: string; empresaId?: string; tenantId?: string };
        sUser.usuarioId = token.usuarioId as string;
        sUser.empresaId = token.empresaId as string;
        sUser.tenantId = token.tenantId as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const GET = NextAuth(authOptions).GET;
export const POST = NextAuth(authOptions).POST;
