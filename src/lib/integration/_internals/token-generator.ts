export interface GeneratedProtheusToken {
  token: string;
  expiresAt: Date;
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
