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
      // Rampa de cobertura (REFACTORING_POLICY §3.4): threshold = real medido
      // menos folga de 2 pontos, nunca acima do real. Onde o floor obrigatório
      // (§3.4) já está abaixo do real, vale o floor. Subir a cada PR que ganhar
      // cobertura, até a meta de 80%.
      thresholds: {
        statements: 48,
        branches: 39,
        functions: 46,
        lines: 48,
        "src/lib/utils/**": { lines: 70 },
        "src/lib/security/**": { lines: 90 },
        "src/lib/auth.ts": { lines: 80 },
        "src/lib/integration/**": { lines: 55 },
        "src/hooks/**": { lines: 16 },
        "src/components/**": { lines: 6 },
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
