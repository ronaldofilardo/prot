#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

// Carrega arquivos .env caso existam no ambiente de build
const envFiles = [".env.production.local", ".env.local", ".env.production", ".env"];
for (const file of envFiles) {
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        let val = (match[2] || "").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    }
  }
}

// Fallback resiliente entre variáveis de banco da Vercel / Neon / Supabase
const resolvedDbUrl =
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL;

if (resolvedDbUrl) {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = resolvedDbUrl;
    console.log("[build] DATABASE_URL definida a partir de fallback disponível (DIRECT_URL/POSTGRES_URL).");
  }
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = resolvedDbUrl.replace("-pooler.", ".");
  }
}

try {
  execSync("npx prisma generate && npx prisma migrate deploy && npx next build", {
    stdio: "inherit",
    env: process.env,
  });
} catch (error) {
  const exitCode = typeof error === "object" && error !== null && "status" in error
    ? (error.status ?? 1)
    : 1;
  process.exit(Number(exitCode));
}
