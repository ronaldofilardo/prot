import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./vitest-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.*", "src/**/__tests__/**"],
      // Rampa de cobertura (REFACTORING_POLICY §3.4): threshold = min(floor §3.4,
      // floor(real medido) - 2 pontos), nunca acima do real. Subir a cada PR que
      // ganhar cobertura, até a meta de 80% (atingida na Fase 6 — real 90.7% linhas).
      thresholds: {
        statements: 80,
        branches: 79,
        functions: 80,
        lines: 80,
        "src/lib/utils/**": { lines: 90 },
        "src/lib/security/**": { lines: 90 },
        "src/lib/auth*.ts": { lines: 80 },
        "src/lib/integration/**": { lines: 55 },
        "src/hooks/**": { lines: 30 },
        "src/components/**": { lines: 30 },
        "src/app/api/**": { lines: 60 },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
