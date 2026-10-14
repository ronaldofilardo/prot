export interface CredenciaisPayload {
  username?: string;
  password?: string;
  accessToken?: string;
  baseUrl?: string;
}

export async function carregarCredenciaisSalvas(
  setSavedUser: (v: string | null) => void,
  setUsername: (v: string) => void
) {
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

export function buildPayload(username: string, password: string, accessToken: string): CredenciaisPayload {
  const p: CredenciaisPayload = {};
  if (username.trim()) p.username = username.trim();
  if (password?.trim()) p.password = password.trim();
  if (accessToken?.trim()) p.accessToken = accessToken.trim();
  return p;
}

export async function salvarCredenciaisApi(payload: CredenciaisPayload) {
  const res = await fetch("/api/protheus/credenciais", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao conectar ao Protheus com as credenciais informadas.");
  return data;
}
