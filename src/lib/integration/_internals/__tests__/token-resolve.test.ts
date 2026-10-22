import { describe, it, expect } from "vitest";
import { isTokenValid } from "../token-resolve";
import { createProtheusJwt } from "../token-generator";

function makeJwt(expSecFromNow: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: now + expSecFromNow })).toString("base64url");
  return `${header}.${payload}.assinatura-real`;
}

describe("isTokenValid", () => {
  it("retorna false para token vazio", () => {
    expect(isTokenValid(null, null)).toBe(false);
    expect(isTokenValid("", null)).toBe(false);
    expect(isTokenValid(undefined, undefined)).toBe(false);
  });

  it("retorna false para JWT expirado no payload", () => {
    expect(isTokenValid(makeJwt(-60), new Date(Date.now() + 3600_000))).toBe(false);
  });

  it("retorna false quando expiresAt está na margem de 60s", () => {
    expect(isTokenValid(makeJwt(3600), new Date(Date.now() + 30_000))).toBe(false);
  });

  it("retorna true para token real não expirado", () => {
    expect(isTokenValid(makeJwt(3600), new Date(Date.now() + 3600_000))).toBe(true);
  });

  it("retorna false para JWT forjado mesmo com exp válida de 24h", () => {
    const forged = createProtheusJwt("admin");
    expect(forged.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(isTokenValid(forged.token, forged.expiresAt)).toBe(false);
  });

  it("retorna false para literal sig_totvs_fwjwt_auto_renew", () => {
    expect(isTokenValid("sig_totvs_fwjwt_auto_renew", new Date(Date.now() + 3600_000))).toBe(false);
  });
});
