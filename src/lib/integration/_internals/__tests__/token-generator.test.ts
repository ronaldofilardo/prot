import { describe, it, expect } from "vitest";
import { createProtheusJwt, isForgedProtheusToken } from "../token-generator";

describe("token-generator.ts", () => {
  describe("createProtheusJwt", () => {
    it("gera JWT com 3 segmentos e exp futura", () => {
      const { token, expiresAt } = createProtheusJwt("admin");
      const parts = token.split(".");
      expect(parts).toHaveLength(3);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("usa assinatura forjada em base64url", () => {
      const { token } = createProtheusJwt("admin");
      const sig = token.split(".")[2];
      const expected = Buffer.from("sig_totvs_fwjwt_auto_renew").toString("base64url");
      expect(sig).toBe(expected);
    });
  });

  describe("isForgedProtheusToken", () => {
    it("retorna false para null/undefined/vazio", () => {
      expect(isForgedProtheusToken(null)).toBe(false);
      expect(isForgedProtheusToken(undefined)).toBe(false);
      expect(isForgedProtheusToken("")).toBe(false);
    });

    it("retorna false para token real sem a marca", () => {
      expect(isForgedProtheusToken("header.payload.signature")).toBe(false);
      expect(isForgedProtheusToken("abc.def.ghi")).toBe(false);
    });

    it("retorna true para literal plain-text", () => {
      expect(isForgedProtheusToken("sig_totvs_fwjwt_auto_renew")).toBe(true);
      expect(isForgedProtheusToken("xxx.sig_totvs_fwjwt_auto_renew_yyy")).toBe(true);
    });

    it("retorna true para JWT forjado com assinatura em base64url", () => {
      const { token } = createProtheusJwt("admin");
      expect(isForgedProtheusToken(token)).toBe(true);
    });

    it("retorna true para JWT com 3 segmentos e 3o igual ao base64url da marca", () => {
      const sig = Buffer.from("sig_totvs_fwjwt_auto_renew").toString("base64url");
      expect(isForgedProtheusToken(`h.p.${sig}`)).toBe(true);
    });

    it("retorna false para JWT com 3 segmentos e assinatura diferente", () => {
      expect(isForgedProtheusToken("h.p.realSignature123")).toBe(false);
    });
  });
});
