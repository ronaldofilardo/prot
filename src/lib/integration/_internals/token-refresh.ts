import { executeOAuthRequest } from "./token-network";
import type { MemoryTokenState } from "./token-types";

export async function tryRefreshToken(
  tokenUrl: string,
  basicAuth: string,
  refreshToken?: string | null
): Promise<MemoryTokenState | null> {
  if (!refreshToken) return null;
  try {
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
    const result = await executeOAuthRequest(tokenUrl, basicAuth, body);
    return {
      accessToken: result.token,
      refreshToken: result.refreshToken ?? null,
      expiresAt: result.expiresAt,
    };
  } catch {
    return null;
  }
}
