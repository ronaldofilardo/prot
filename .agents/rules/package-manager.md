# Regra de Gerenciador de Pacotes e Execução de Comandos

> **REGRA CRÍTICA DE AMBIENTE LOCAL:**
> Este computador/ambiente **NÃO executa `npm`**. Comandos usando `npm` falharão.
> Todos os agentes de IA devem utilizar exclusivamente **`pnpm`** ou **`npx`**.

---

## Diretrizes de Uso

### 1. Instalação de Dependências e Execução de Scripts
- Use sempre **`pnpm`**:
  - `pnpm install` (em vez de `npm install` ou `npm i`)
  - `pnpm add <pacote>` / `pnpm add -D <pacote>` (em vez de `npm install <pacote>`)
  - `pnpm run <script>` ou `pnpm <script>` (ex: `pnpm run dev`, `pnpm build`, `pnpm test`)

### 2. Execução de CLIs e Geradores
- Use **`npx`** ou **`pnpm dlx`**:
  - `npx <comando>` (ex: `npx -y create-next-app@latest`)
  - `pnpm dlx <comando>`

### 3. Proibição
- ❌ **JAMAIS** executar ou sugerir comandos `npm` (`npm install`, `npm run`, `npm dev`, `npm test`, etc.).
