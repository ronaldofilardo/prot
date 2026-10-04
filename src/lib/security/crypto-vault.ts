import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.PROTHEUS_CRED_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "default-protheus-secret-salt-2026";
  return createHash("sha256").update(secret).digest();
}

/**
 * Cifra um texto em texto plano usando AES-256-GCM.
 * Retorna string segura no formato: ivHex:authTagHex:encryptedHex
 */
export function encryptText(plainText: string): string {
  try {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (error) {
    throw new Error(`Falha ao criptografar dados: ${error instanceof Error ? error.message : "erro desconhecido"}`);
  }
}

/**
 * Decifra um texto cifrado no formato ivHex:authTagHex:encryptedHex usando AES-256-GCM.
 */
export function decryptText(cipherText: string): string {
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) {
      throw new Error("Formato de payload cifrado invalido");
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(`Falha ao decifrar dados: ${error instanceof Error ? error.message : "chave ou conteudo invalido"}`);
  }
}
