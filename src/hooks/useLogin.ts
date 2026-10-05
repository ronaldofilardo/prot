"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { logAuth } from "@/lib/utils/logger";

type SubmissaoDeps = {
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  irParaDashboard: () => void;
};

async function submeterLogin(
  e: React.FormEvent,
  campos: { email: string; cpf: string; password: string },
  d: SubmissaoDeps
): Promise<void> {
  e.preventDefault();
  d.setLoading(true);
  d.setError(null);
  try {
    logAuth("Iniciando processo de autenticacao");
    const identifier = (campos.email.trim() || campos.cpf.trim()).toLowerCase();
    const result = await signIn("credentials", { email: identifier, password: campos.password, redirect: false });
    if (result?.error) {
      logAuth("Falha na autenticacao");
      d.setError("Credenciais invalidas. Verifique seu e-mail e senha.");
      return;
    }
    logAuth("Autenticacao bem-sucedida, redirecionando");
    d.irParaDashboard();
  } catch {
    d.setError("Nao foi possivel autenticar. Verifique suas credenciais.");
  } finally {
    d.setLoading(false);
  }
}

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
    (e: React.FormEvent) =>
      submeterLogin(e, { email, cpf, password }, { setLoading, setError, irParaDashboard: () => router.replace("/dashboard") }),
    [email, cpf, password, router]
  );

  return { cpf, setCpf, email, setEmail, password, setPassword, loading, error, handleSubmit };
}
