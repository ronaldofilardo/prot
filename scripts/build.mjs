#!/usr/bin/env node
import { execSync } from "node:child_process";

// Garante que DIRECT_URL exista no ambiente antes dos comandos do Prisma.
// No Vercel, se o usuário configurou apenas DATABASE_URL, auto-configuramos
// DIRECT_URL a partir de DATABASE_URL (removendo -pooler se for Neon).
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL.replace("-pooler.", ".");
  console.log("[build] DIRECT_URL auto-configurado a partir de DATABASE_URL.");
}

try {
  execSync("prisma generate && prisma migrate deploy && next build", {
    stdio: "inherit",
    env: process.env,
  });
} catch (error) {
  const exitCode = typeof error === "object" && error !== null && "status" in error
    ? (error.status ?? 1)
    : 1;
  process.exit(Number(exitCode));
}
