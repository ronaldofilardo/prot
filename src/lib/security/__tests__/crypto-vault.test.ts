import { describe, expect, it } from "vitest";
import { encryptText, decryptText } from "../crypto-vault";

describe("crypto-vault (AES-256-GCM)", () => {
  it("realiza roundtrip de criptografia e decriptografia com sucesso", () => {
    const original = "LC1sysC0nt@l2026adml@";
    const encrypted = encryptText(original);

    expect(encrypted).not.toEqual(original);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptText(encrypted);
    expect(decrypted).toEqual(original);
  });

  it("gera ciphertexts diferentes para o mesmo texto plano (devido ao IV aleatorio)", () => {
    const secret = "minha-senha-secreta";
    const enc1 = encryptText(secret);
    const enc2 = encryptText(secret);

    expect(enc1).not.toEqual(enc2);
    expect(decryptText(enc1)).toEqual(secret);
    expect(decryptText(enc2)).toEqual(secret);
  });

  it("rejeita payload com formato invalido", () => {
    expect(() => decryptText("invalido")).toThrow("Formato de payload cifrado invalido");
    expect(() => decryptText("a:b")).toThrow("Formato de payload cifrado invalido");
  });

  it("rejeita payload autenticado adulterado", () => {
    const encrypted = encryptText("senha123");
    const [iv, tag, ciphertext] = encrypted.split(":");
    const tamperedTag = (tag[0] === "a" ? "b" : "a") + tag.slice(1);
    const tampered = `${iv}:${tamperedTag}:${ciphertext}`;

    expect(() => decryptText(tampered)).toThrow("Falha ao decifrar dados");
  });
});
