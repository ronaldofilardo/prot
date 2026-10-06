import { useState, useEffect, useCallback } from "react";

interface Feedback {
  tipo: "ok" | "erro";
  msg: string;
}

async function carregarCredenciaisSalvas(setSavedUser: (v: string | null) => void, setUsername: (v: string) => void) {
  try {
    const res = await fetch("/api/protheus/credenciais");
    if (!res?.ok) return;
    const d = await res.json();
    if (d?.configurado && d?.username) {
      setSavedUser(d.username);
      setUsername(d.username);
    }
  } catch {
    // Silencioso se fetch nao configurado ou em ambiente de teste
  }
}

async function salvarCredenciaisApi(username: string, password: string) {
  const res = await fetch("/api/protheus/credenciais", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao conectar ao Protheus com as credenciais informadas.");
  return data;
}

export function useProtheusCredenciais(onSuccess?: () => void) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedUser, setSavedUser] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarCredenciaisSalvas(setSavedUser, setUsername).then(() => {
      if (!ativo) return;
    });
    return () => { ativo = false; };
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setFeedback({ tipo: "erro", msg: "Informe o usuário e a senha do Protheus." });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await salvarCredenciaisApi(username, password);
      setFeedback({ tipo: "ok", msg: "Credenciais salvas! Token renovado e rotacionado automaticamente." });
      setSavedUser(username);
      setPassword("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setFeedback({ tipo: "erro", msg: err instanceof Error ? err.message : "Falha de rede ao conectar com o servidor." });
    } finally {
      setLoading(false);
    }
  };

  return { username, setUsername, password, setPassword, loading, savedUser, feedback, handleSalvar };
}