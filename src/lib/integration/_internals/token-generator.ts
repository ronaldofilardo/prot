export interface GeneratedProtheusToken {
  token: string;
  expiresAt: Date;
}

const FORGED_SIG_PLAIN = "sig_totvs_fwjwt_auto_renew";
const FORGED_SIG_B64URL = Buffer.from(FORGED_SIG_PLAIN).toString("base64url");

/**
 * Detecta JWT forjado localmente (assinatura fake).
 * O token real embute a marca em base64url no 3o segmento, entao o check
 * precisa cobrir tanto o literal quanto o encoding.
 */
export function isForgedProtheusToken(token: string | null | undefined): boolean {
  if (!token) return false;
  if (token.includes(FORGED_SIG_PLAIN)) return true;
  const parts = token.split(".");
  return parts.length === 3 && parts[2] === FORGED_SIG_B64URL;
}

export function createProtheusJwt(
  username = "Administrador",
  envId = "CHVDPE_141403_PR_DV",
  durationSec = 86400
): GeneratedProtheusToken {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + durationSec;

  const headerObj = { alg: "RS256", typ: "JWT", kid: "pJwtPublicKeyFor256" };
  const payloadObj = {
    iss: "TOTVS-ADVPL-FWJWT",
    sub: username,
    iat: now,
    userid: "000000",
    exp,
    envId,
  };

  const b64Header = Buffer.from(JSON.stringify(headerObj)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const b64Sig = Buffer.from("sig_totvs_fwjwt_auto_renew").toString("base64url");

  return {
    token: `${b64Header}.${b64Payload}.${b64Sig}`,
    expiresAt: new Date(exp * 1000),
  };
}
