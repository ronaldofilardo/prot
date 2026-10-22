import fs from "fs";
import path from "path";
import { logIntegration } from "@/lib/utils/logger";
import { isForgedProtheusToken } from "./token-generator";

interface MemoryTokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}

const memoryState: MemoryTokenState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

export function getMemoryToken(): MemoryTokenState {
  return memoryState;
}

export function clearMemoryToken(): void {
  memoryState.accessToken = null;
  memoryState.refreshToken = null;
  memoryState.expiresAt = null;
}

export function setMemoryToken(accessToken: string, expiresAt: Date, refreshToken?: string): void {
  memoryState.accessToken = accessToken;
  memoryState.expiresAt = expiresAt;
  if (refreshToken) memoryState.refreshToken = refreshToken;

  process.env.PROTHEUS_REST_ACCESS_TOKEN = accessToken;
  if (refreshToken) process.env.PROTHEUS_REST_REFRESH_TOKEN = refreshToken;

  syncLocalEnvFile(accessToken, refreshToken);
}

/** Substitui a variavel se ja existir no .env; senao, acrescenta ao final. */
function upsertEnvVar(content: string, nome: string, valor: string): string {
  const linha = `${nome}="${valor}"`;
  const regex = new RegExp(`^${nome}=.*$`, "m");
  if (regex.test(content)) return content.replace(regex, () => linha);
  const separador = content.length === 0 || content.endsWith("\n") ? "" : "\n";
  return `${content}${separador}${linha}\n`;
}

function syncLocalEnvFile(accessToken: string, refreshToken?: string): void {
  try {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
    if (!accessToken || isForgedProtheusToken(accessToken)) return;
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;
    let content = fs.readFileSync(envPath, "utf-8");

    content = upsertEnvVar(content, "PROTHEUS_REST_ACCESS_TOKEN", accessToken);
    if (refreshToken) content = upsertEnvVar(content, "PROTHEUS_REST_REFRESH_TOKEN", refreshToken);
    fs.writeFileSync(envPath, content, "utf-8");
    logIntegration("Arquivo .env atualizado com novos tokens Protheus", { expiraEm: memoryState.expiresAt });
  } catch {
    // Falha silenciosa em ambientes de producao ou somente-leitura
  }
}
