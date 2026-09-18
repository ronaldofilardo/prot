"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { logAuth } from "@/lib/utils/logger";

export function useLogin() {
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      try {
        logAuth("Iniciando processo de autenticacao");

        const identifier = (email.trim() || cpf.trim()).toLowerCase();

        const result = await signIn("credentials", {
          email: identifier,
          password,
          redirect: false,
        });

        if (result?.error) {
          logAuth("Falha na autenticacao");
          setError("Credenciais invalidas. Verifique seu e-mail e senha.");
          return;
        }

        logAuth("Autenticacao bem-sucedida, redirecionando");
        router.replace("/dashboard");
      } catch {
        setError("Nao foi possivel autenticar. Verifique suas credenciais.");
      } finally {
        setLoading(false);
      }
    },
    [email, cpf, password, router]
  );

  return {
    cpf, setCpf,
    email, setEmail,
    password, setPassword,
    loading, error,
    handleSubmit,
  };
}
