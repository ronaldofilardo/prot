import { useState, useEffect, useCallback } from "react";

interface Feedback {
  tipo: "ok" | "erro";
  msg: string;
}

interface CredenciaisPayload {
  username?: string;
  password?: string;
  accessToken?: string;
  baseUrl?: string;
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

async function salvarCredenciaisApi(payload: CredenciaisPayload) {
  const res = await fetch("/api/protheus/credenciais", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao conectar ao Protheus com as credenciais informadas.");
  return data;
}

function buildPayload(username: string, password: string, accessToken: string): CredenciaisPayload {
  const p: CredenciaisPayload = {};
  if (username.trim()) p.username = username.trim();
  if (password?.trim()) p.password = password.trim();
  if (accessToken?.trim()) p.accessToken = accessToken.trim();
  return p;
}

function validateInputs(username: string, accessToken: string, setFeedback: (v: Feedback | null) => void): boolean {
  if (!username.trim() && !accessToken.trim()) {
    setFeedback({ tipo: "erro", msg: "Informe o usuário/senha ou o Token de acesso do Protheus." });
    return false;
  }
  return true;
}

function applySuccess(
  data: { aviso?: string },
  username: string,
  setFeedback: (v: Feedback | null) => void,
  setSavedUser: (v: string | null) => void,
  setPassword: (v: string) => void,
  setAccessToken: (v: string) => void,
  onSuccess?: () => void
) {
  const msg = data.aviso || "Credenciais salvas! Token atualizado e validado com sucesso.";
  setFeedback({ tipo: "ok", msg });
  if (username.trim()) setSavedUser(username.trim());
  setPassword("");
  setAccessToken("");
  if (onSuccess) onSuccess();
}

function applyError(
  err: unknown,
  setFeedback: (v: Feedback | null) => void
) {
  setFeedback({ tipo: "erro", msg: err instanceof Error ? err.message : "Falha de rede ao conectar com o servidor." });
}

function handleSalvar(
  e: React.FormEvent,
  username: string,
  password: string,
  accessToken: string,
  setFeedback: (v: Feedback | null) => void,
  setSavedUser: (v: string | null) => void,
  setPassword: (v: string) => void,
  setAccessToken: (v: string) => void,
  setLoading: (v: boolean) => void,
  onSuccess?: () => void
) {
  e.preventDefault();
  if (!validateInputs(username, accessToken, setFeedback)) return;

  setLoading(true);
  setFeedback(null);
  const payload = buildPayload(username, password, accessToken);
  salvarCredenciaisApi(payload)
    .then((data) => applySuccess(data, username, setFeedback, setSavedUser, setPassword, setAccessToken, onSuccess))
    .catch((err) => applyError(err, setFeedback))
    .finally(() => setLoading(false));
}

export function useProtheusCredenciais(onSuccess?: () => void) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
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

  const handleSalvarCallback = useCallback(
    (e: React.FormEvent) => handleSalvar(e, username, password, accessToken, setFeedback, setSavedUser, setPassword, setAccessToken, setLoading, onSuccess),
    [username, password, accessToken, onSuccess]
  );

  return { username, setUsername, password, setPassword, accessToken, setAccessToken, loading, savedUser, feedback, handleSalvar: handleSalvarCallback };
}