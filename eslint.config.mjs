import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees e artefatos gerados (não são fonte do projeto):
    ".kilo/**",
    "coverage/**",
    "graft/**",
  ]),
  {
    // REFACTORING_POLICY §4: complexidade ciclomática máxima por função = 10.
    rules: { complexity: ["error", 10] },
  },
  {
    // REFACTORING_POLICY §11.4: funções com no máximo 30 linhas.
    rules: { "max-lines-per-function": ["error", 30] },
  },
  {
    // Testes são isentos de max-lines-per-function (callbacks de describe/it são longos por natureza).
    files: ["**/__tests__/**", "**/*.test.*"],
    rules: { "max-lines-per-function": "off" },
  },
  {
    // §4.1: prisma/ (ex.: seed.ts) fica fora do escopo de src/ — limite próprio de 300 linhas.
    files: ["prisma/**"],
    rules: { complexity: "off", "max-lines-per-function": "off" },
  },
]);

export default eslintConfig;
