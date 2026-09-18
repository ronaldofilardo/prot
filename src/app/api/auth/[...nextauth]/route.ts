import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Antes: este arquivo tinha um provider próprio, paralelo ao de
// src/lib/auth.ts, que aceitava QUALQUER CPF ou e-mail bem formatado sem
// checar senha (authorize retornava usuário válido sem validação).
// Agora há uma única fonte de verdade (authOptions), com senha checada
// contra o hash em Usuario e empresaId/tenantId amarrados na sessão.

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
