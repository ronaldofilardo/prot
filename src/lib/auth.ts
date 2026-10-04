import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authorizeCredentials } from "@/lib/auth-claims";

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
      authorize: authorizeCredentials,
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
