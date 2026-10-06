import fs from "fs";
import path from "path";
import { logIntegration } from "@/lib/utils/logger";

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

function syncLocalEnvFile(accessToken: string, refreshToken?: string): void {
  try {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
    if (!accessToken || accessToken.includes("sig_totvs_fwjwt_auto_renew")) return;
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;
    let content = fs.readFileSync(envPath, "utf-8");

    content = content.replace(/^PROTHEUS_REST_ACCESS_TOKEN=.*$/m, `PROTHEUS_REST_ACCESS_TOKEN="${accessToken}"`);
    if (refreshToken) {
      content = content.replace(/^PROTHEUS_REST_REFRESH_TOKEN=.*$/m, `PROTHEUS_REST_REFRESH_TOKEN="${refreshToken}"`);
    }
    fs.writeFileSync(envPath, content, "utf-8");
    logIntegration("Arquivo .env atualizado com novos tokens Protheus", { expiraEm: memoryState.expiresAt });
  } catch {
    // Falha silenciosa em ambientes de producao ou somente-leitura
  }
}
