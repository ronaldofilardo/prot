# Política de Refatoração — PROT

> **Versão:** 1.0
> **Vigência:** Outubro 2026
> **Revisão:** Trimestral (próxima: Janeiro 2027)
> **Regra de ouro:** Nenhuma refatoração inicia sem `pnpm test` 100% verde e linha base documentada.
> **Complementaridade:** esta política regula **mudança de código existente**. A **geração** de código novo é regida por `AGENTS.md` (Premissas de Programação). Onde houver conflito, prevalece o limite mais restritivo.

---

## 1. Princípios Gerais

- **Baby Steps:** mudanças pequenas e incrementais, validadas a cada passo.
- **Zero Débitos Acumulados:** dívida técnica paga no mesmo sprint ou priorizada na fila (§11).
- **Coesão Alta, Acoplamento Baixo:** uma responsabilidade por arquivo.
- **Regra do Escorrista:** "Deixe o código mais limpo do que encontrou."
- **Fail Fast:** se a suíte não estiver verde antes de refatorar, **PARE**. Corrija ou carregue o código como está.
- **Zero regressões:** refatoração não muda comportamento observável (I/O, status HTTP, payloads, logs, seeds). Se mudou, é feature — não entra em commit de refatoração.
- **Ratchet:** uma métrica medida nunca pode piorar. Cobertura, complexidade e tamanho só sobem de escada.

---

## 2. Stack e Comandos Oficiais

| Item | Valor |
|------|-------|
| Framework | Next.js **16.3.5** (App Router, `src/` root) |
| Linguagem | **TypeScript 5** (`strict: true`), alias `@/*` → `./src/*` |
| Banco | PostgreSQL + **Prisma 5.22** (9 modelos, `prisma/schema.prisma`) |
| Auth | NextAuth v4 (Credentials + JWT) — `src/lib/auth.ts` |
| UI | React 19, Tailwind v4, Radix/shadcn, Recharts, ECharts |
| Estado | Zustand (disponível), `fetch` + hooks locais (padrão atual) |
| Testes | **Vitest 5** + Testing Library, `happy-dom` |
| Package manager | **`pnpm` exclusivamente** |

| Finalidade | Comando |
|-----------|---------|
| Testes | `pnpm test` (`vitest run`) |
| Cobertura | `pnpm test:coverage` (`vitest run --coverage`) |
| Build | `pnpm build` (`prisma generate && prisma migrate deploy && next build`) |
| Lint | `pnpm lint` |
| Grafo de contexto | `graft build` |

> **PROIBIDO `npm`** neste repositório (ver `AGENTS.md` §0). Use `pnpm` ou `npx`.
> **Atenção:** `pnpm test --coverage` **não funciona**. O script de cobertura é `pnpm test:coverage`.
> `pnpm build` executa `prisma migrate deploy` — para build de verificação sem tocar em banco use `npx next build`.

---

## 3. Gate Obrigatório — Linha Base de Testes

**Nenhuma refatoração inicia sem linha base de testes estabelecida.**

### 3.1 Antes de qualquer alteração

```bash
pnpm test              # 100% verde (gate real)
pnpm test:coverage     # medição + thresholds da rampa (§3.4) — deve sair com exit 0
pnpm lint              # sem novos erros
npx tsc --noEmit       # typecheck
npx next build         # build OK (evita o migrate deploy)
```

> **Estado atual (Out/2026, pós Fase 0):** baseline **18 arquivos de teste, 115 testes verdes, 38.99% linhas** (`docs/reports/coverage-2026-10.txt`). O threshold de 80% em `vitest.config.mts` era inatingível e deixava `pnpm test:coverage` — e o CI — permanentemente em exit 1. A Rampa de Cobertura (§3.4) **rebaixou os thresholds para o valor real menos 2 pontos de folga**, e agora:
> - O **gate bloqueante** é `pnpm test` + `pnpm lint` + `npx tsc --noEmit` + `npx next build` — todos executados no CI (`.github/workflows/ci.yml`, que antes rodava só `pnpm test:coverage`).
> - `pnpm test:coverage` **fecha com exit 0** e é a medição oficial; cada ganho de cobertura deve subir o threshold correspondente (ratchet §3.4).

### 3.2 Se não houver testes suficientes

**PROIBIDO** iniciar refatoração sem cobertura de:

- Fluxos principais do arquivo
- Casos de sucesso
- Casos de erro e edge cases
- Comportamento atual documentado (status HTTP, shape de resposta, chamadas de logger)

**Ação obrigatória:** (1) escrever testes de caracterização/regressão → (2) confirmar que passam **antes** da mudança → (3) só então refatorar.

### 3.3 Cobertura mínima por tipo

| Tipo | Mínimo |
|------|--------|
| Route Handler (`src/app/api/**/route.ts`) | 80% |
| Client (`lib/integration/**`) | 80% |
| Hook (`src/hooks/**`) | 75% |
| Componente (`src/components/**`) | 75% |
| Página (`src/app/**/page.tsx`) | 75% |
| Utilitário puro (`src/lib/utils/**`) | 90% |
| **Global** | **ratchet §3.4** (meta 80%) |

### 3.4 Rampa de Cobertura (exceção documentada, com prazo)

O threshold global de 80% em `vitest.config.mts` é **a meta**, não o gate diário. Os thresholds aplicados são **rebaixados até o valor real medido menos 2 pontos de folga** (nunca acima do real — acima do real o gate nunca fecha), e o número **nunca pode aumentar** dentro do mesmo trimestre sem subir a cobertura real. Onde o **Floor** já está abaixo do real, vale o Floor.

| Diretório | Cobertura real Out/2026 (linhas) | Threshold em `vitest.config.mts` | Floor / meta |
|-----------|--------------------------------|-------------------------------|--------------|
| `src/lib/utils/**` | 72.73% | 70% | 90% |
| `src/lib/security/**` | 95.83% | 90% | 90% |
| `src/lib/auth.ts` | 88.24% | 80% | 80% |
| `src/lib/integration/**` | 55.64% | 55% | 55% (atingido) |
| `src/hooks/**` | 18.13% | 16% | 30% |
| `src/components/**` | 8.23% | 6% | 30% |
| `src/app/api/**` | 81.50% | 60% | 60% |
| **Global** | **50.97% linhas / 50.50% stmts / 48.33% funcs / 41.32% branches** | **48 / 48 / 46 / 39** | **não reduzir; meta 80%** |

> **Como estes números foram medidos:** agregação recursiva sobre `coverage/lcov.info` (cobertura de todos os arquivos sob o diretório). Os valores anteriores desta tabela (ex.: `src/lib/utils/**` = 96.45%) vinham das linhas de diretório do relatório texto, que **não agrega subdiretórios** — por isso `src/lib/utils/charts/*` (0%) não contava. O threshold em `vitest.config.mts` usa o globo recursivo, então vale o número daqui.

> **Previsão da v1.0 corrigida pela medição (Fase 1):** a nota original dizia que cobrindo `sync-engine`, `protheus-adapter`, `pull-and-sync`, `protheus-client-factory` e as rotas `dashboard`/`upload`/`protheus/pull` a global passaria de 80% com ~35 testes. **Falso:** Fase 1 cobriu 5 desses 6 alvos (50 testes) e a global foi de 38.99% → **50.97%**. O restante até 80% exige `sync-engine`, `protheus-rest-client` e sobretudo os `hooks/**` (18.13%) e `components/**` (8.23%).

### 3.5 Documentar a baseline

```bash
pnpm test:coverage > docs/reports/coverage-<AAAA-MM>.txt
```

Registrar no PR: `Baseline: X testes, Y% linhas, fluxos cobertos: [lista]`.

---

## 4. Limites Métricos (obrigatórios antes do merge)

| Métrica | Limite | Ação |
|---------|--------|------|
| **Linhas por componente** (`*.tsx` sob `src/components`) | **máx. 100** | Bloquear merge acima de 100 (`AGENTS.md` §0) |
| **Linhas por página** (`page.tsx`) | máx. 150 | Extrair hooks/componentes |
| **Linhas por Route Handler** | **máx. 120** | Extrair para `handlers/` + `_internals/` |
| **Linhas por Client/Service/Route de API** | **máx. 200** | Bloquear merge acima de 200 |
| **Linhas por Hook** | máx. 120 | Dividir se > 120 |
| **Linhas por função** | máx. 30 | Decompor antes do merge |
| **Complexidade ciclomática** | **≤ 10 por função** | 11–15: decompor; **16+: bloquear merge** (`AGENTS.md` §0) |
| Parâmetros por função | máx. 3 | Usar objeto de parâmetros |
| Nesting | máx. 2 níveis | Early returns, extrair métodos |
| `any` explícito | proibido como padrão | `unknown` + narrowing; justifiable em fronteira de lib externa |
| `console.*` | proibido | Usar `logSync*` / `logApiError` / `logDashboard` / `logAuth` |
| Cobertura | ratchet §3.4 | Nunca reduzir |

### 4.1 Tamanho de arquivo por tipo

| Tipo | Ideal | Máximo | Ação ao exceder |
|------|-------|--------|----------------|
| Componente `.tsx` | 30–80 | 100 | Extrair subcomponente/hook |
| Página `page.tsx` | 40–120 | 150 | Extrair hooks + `components/` |
| Route Handler | 40–100 | 120 | Extrair `handlers/` + `_internals/` |
| Client de integração | 80–150 | 200 | Dividir por verbo/responsabilidade |
| Hook | 30–90 | 120 | Dividir por eixo de estado |
| Utilitário puro | 20–80 | 120 | Fragmentar por domínio |
| Teste | — | 250 | Dividir por cenário |
| `prisma/seed.ts` | — | 300 | Dividir por modelo (fora do escopo de `src/`) |

---

## 5. Gatilhos de Refatoração

| Gatilho | Ação |
|---------|------|
| Função com +30 linhas | Extrair/decompor |
| Arquivo com 150+ linhas | Planejar divisão |
| Arquivo com 200+ linhas | **Bloquear merge** até refatorar |
| Componente com 100+ linhas | **Bloquear merge** até refatorar |
| Complexidade ciclomática > 10 | Simplificar lógica |
| Código duplicado em 2+ lugares | Extrair para utilitário comum |
| Dependência circular | Refatorar arquitetura |
| Nomenclatura ambígua (`data`, `temp`, `calc`, `getX`) | Renomear imediatamente |
| Comentário explicando "o quê faz" | Substituir por código expressivo |
| `if (empresa)` espalhado na UI | Extrair para hook/serviço |
| Segredo/credencial em memória sem coberta | `crypto-vault` (`src/lib/security`) |
| Migração nova fora do padrão numérico | Ver §7.5 |

---

## 6. Domínios do Sistema

O PROT é **multi-tenant** (`Tenant` → `Empresa` matriz/filial → `Usuario` com acesso por empresa). Toda refatoração deve preservar o escopo de tenant/empresa e **nunca** misturar domínios.

| Domínio | Rotas | Responsabilidade | Raiz |
|---------|-------|------------------|------|
| **Auth** | `/auth/login`, `/api/auth/[...nextauth]` | Credenciais, sessão JWT, `empresaId`/`tenantId` no token | `src/lib/auth.ts`, `src/middleware.ts` |
| **Dashboard** | `/dashboard`, `/api/dashboard` | KPIs, faturamento, contas a receber, gráficos | `src/components/dashboard/**`, `src/lib/utils/charts/**` |
| **Upload** | `/upload`, `/api/upload` | Receber CSV, parse, canonicalizar, sincronizar | `src/components/upload/**` |
| **Ingest** | `/api/ingest` | Entrada canônica via API key (batch externo) | `src/app/api/ingest/route.ts` |
| **Protheus** | `/api/protheus/*` | Pull REST/SOAP, credencial por empresa, sync | `src/lib/integration/**` |
| **Infra** | — | Prisma singleton, crypto-vault, logger | `src/lib/db/**`, `src/lib/security/**`, `src/lib/utils/logger.ts` |
| **UI Primitives** | — | shadcn genérico e reutilizável | `src/components/ui/**` |

> **Fronteiras:** `src/components/**` nunca importa `prisma` diretamente. `src/lib/**` nunca importa `next/server` nem componentes React (exceto `src/lib/auth.ts`, que é configuração server-side por natureza). Detalhes de Protheus nunca vazam para `src/components/**` — passam por `src/hooks/**`.

---

## 7. Separação de Responsabilidades e Estrutura

### 7.1 Camadas

```
UI (src/components, src/app/**/page.tsx)
      ↓ consome apenas hooks
Aplicação (src/hooks/**)
      ↓ consome apenas contratos/domínio
Domínio (src/lib/integration/canonical.ts, src/lib/utils/**)
      ↓ consome interfaces
Infra (src/lib/db/**, src/lib/security/**, clients Protheus)
Transporte (src/app/api/**/route.ts — valida, delega, responde)
```

Regras:

- `src/app/api/**/route.ts` → **transporte HTTP**. Máximo 120 linhas. Só parse, auth, delegate, status.
- `src/hooks/**` → estado + orquestração de fetch. Testável sem renderizar componente.
- `src/lib/**` → domínio e infra. Sem `react`, sem `next/server`.
- `src/components/**` → apresentação. Sem `fetch` direto, sem `prisma`.

### 7.2 Route Handlers

```
❌ RUIM: validação + regra + queries Prisma + formatação em route.ts (200 linhas)

✅ BOM:
src/app/api/dashboard/route.ts            (≤120 linhas — apenas HTTP)
├── handlers/dashboard.ts                  (orquestração do caso de uso)
├── _internals/dashboard-query.ts          (queries + RLS)
├── schemas em src/lib/schemas/            (Zod — criar quando houver)
└── types em src/lib/types/dashboard.ts    (DTOs)
```

> O padrão `handlers/` + `_internals/` já é adotado por `src/lib/integration/**` (`protheus-client.ts` contrato + `protheus-client-factory.ts` + `protheus-adapter.ts` + `index.ts` barrel). **Preservar e estender.**

### 7.3 Integração Protheus (contrato existente — não quebrar)

```
src/lib/integration/
├── index.ts                     barrel (API pública do subsistema)
├── protheus-client.ts           INTERFACE ProtheusClient + ProtheusClientError
├── protheus-rest-client.ts      implementação REST  (440 linhas → fila 🔴)
├── protheus-soap-client.ts      implementação SOAP
├── protheus-client-factory.ts   Factory: escolhe REST|SOAP por env/DB
├── protheus-token-provider.ts   Strategy de token (OAuth2, cache 60s)
├── protheus-adapter.ts          Adapter: linha Protheus → Canonical
├── canonical.ts                 modelo canônico (Party/Invoice/Title/Payment)
├── sync-engine.ts               upsert idempotente (286 linhas → fila 🔴)
├── pull-and-sync.ts             caso de uso de ponta a ponta
└── logger.ts                    logSyncStart/Success/Error/Skip/Reconciliation
```

Regras: só `protheus-client-factory.ts` instancia cliente. O adapter é o **único** tradutor Protheus→Canonical (upload CSV e pull compartilham). Toda operação assíncrona tem `try/catch` e log com prefixo.

### 7.4 Estrutura de pastas (real)

```
src/
├── app/                        # App Router
│   ├── layout.tsx  page.tsx  globals.css  middleware.ts (raiz de src/)
│   ├── auth/login/page.tsx
│   ├── dashboard/page.tsx
│   ├── upload/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── dashboard/route.ts
│       ├── upload/route.ts
│       ├── ingest/route.ts
│       └── protheus/{pull,empresa}/route.ts
├── components/
│   ├── ui/                     # shadcn genérico (button, card, badge, input, table)
│   ├── auth/LoginForm.tsx
│   ├── dashboard/              # KpiCards, ChartsGrid, FilterBar, Tables…
│   ├── charts/                 # wrappers ECharts/Recharts + index.ts
│   ├── empresa/                # painel Protheus + common/ (5 subcomponentes)
│   ├── upload/                 # UploadPanel + Dropzone/Sync/…
│   └── Providers.tsx
├── hooks/                      # useDashboard, useFilters, useLogin, useTema,
│                               # useUploadPanel, useEmpresaProtheus (+ __tests__/)
├── lib/
│   ├── db/prisma-client.ts     # singleton + withEmpresaRLS()
│   ├── auth.ts                 # authOptions NextAuth
│   ├── security/               # crypto-vault (AES-256-GCM) + index.ts
│   ├── integration/            # ver §7.3
│   ├── types/                  # db.ts, dashboard.ts
│   └── utils/                  # logger, empresa-grupo, charts/*, theme, __tests__/
└── middleware.ts
```

> **Dívida estrutural ativa:** existem raízes duplicadas no repositório — `components/ui/{table,card,button,badge}.tsx` e `lib/utils.ts`. Nenhum arquivo importa de `"components/..."` ou `"lib/..."` (verificado por busca). São cópias divergentes (`import { cn } from "cn"` vs `@/lib/utils`). **Deletar na Fase de Dívida (§11.3)** e manter apenas `src/`.

### 7.5 Migrações Prisma

- Prefixo numérico timestamp: `YYYYMMDDHHMMSS_descricao_curta/`.
- **PROIBIDO:** `fix-*`, `apply_*`, `sync_*`, `DEPRECATED_*`, `XXXX_*`, migration sem prefixo.
- Máx. 20 KB por migration — acima disso, dividir.
- `pnpm build` roda `prisma migrate deploy`: nuncaeditar migration já aplicada; criar nova.

### 7.6 Nomenclatura (TypeScript)

```ts
// ❌ Ruim
function calc(x: number, y: number) {}
const data = await fetch(url);

// ✅ Bom
function calculateGrossRevenue(unitPrice: number, quantity: number) {}
const billingInvoices = await fetchBillingInvoices(empresaId);
```

```ts
// ❌ Ruim — múltiplas responsabilidades
async function syncFromProtheus(empresaId: string) {
  await fetchCredentials();
  await fetchInvoices();
  await upsertInvoices();
  await writeSyncLog();
}

// ✅ Bom
async function fetchProtheusCredentials(empresaId: string) {}
async function pullProtheusInvoices(credentials) {}
async function upsertInvoices(canonicalInvoices) {}
async function recordSyncLog(result) {}
```

Convenções: `*.client.ts` (infra externa), `*-factory.ts`, `*-adapter.ts`, `*.service.ts` (orquestração), `*.repository.ts` (acesso a dados), `canonical.ts`/`types.ts` (contratos), `useXxx.ts` (hooks), `__tests__/*.test.ts` (co-localizado).

---

## 8. Padrões de Extração

### 8.1 Hooks

```ts
// Antes: fetch + estado dentro do componente
// Depois: src/hooks/useXxx.ts
export function useXxx() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/xxx");
      if (!res.ok) throw new Error(`Falha ao carregar (${res.status})`);
      setData(await res.json());
    } catch (error) {
      logApiError("xxx", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void fetchData(); }, [fetchData]);
  return { data, loading, refetch: fetchData };
}
```

### 8.2 Componentes

```tsx
// Antes: page com fetch + form + tabela
// Depois: page orquestra, hook busca, componente_presenta
"use client";
export default function DashboardPage() {
  const { data, loading } = useDashboard();
  if (loading) return <DashboardSkeleton />;
  return (
    <>
      <DashboardHeader />
      <DashboardKpiCards data={data} />
      <DashboardChartsGrid data={data} />
      <DashboardFilterBar />
      <DashboardInvoicesTable rows={data.invoices} />
    </>
  );
}
```

### 8.3 Route Handler

```ts
// src/app/api/xxx/route.ts — 40-100 linhas, apenas HTTP
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildDashboardReport } from "./handlers/dashboard";
import { logApiError } from "@/lib/utils/logger";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.empresaId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const report = await buildDashboardReport(session.user.empresaId);
    return NextResponse.json(report);
  } catch (error) {
    logApiError("GET /api/dashboard", error);
    return NextResponse.json({ error: "Falha interna" }, { status: 500 });
  }
}
```

### 8.4 Ordem de extração

1. Constantes e tipos
2. Funções utilitárias puras
3. Hooks
4. Subcomponentes
5. Handlers / serviços
6. `_internals` de infraestrutura

---

## 9. Fluxo de Refatoração

```
1. IDENTIFICAR  → código que precisa de melhoria (usa `graft ask` / métricas)
2. VERIFICAR    → pnpm test + pnpm lint + npx next build verdes (GATE)
3. MEDIR        → linhas, CC, cobertura, duplicação (§12)
4. TESTAR       → testes de caracterização sobre o código-alvo
5. REFATORAR    → mudança mínima, na ordem de extração (§8.4)
6. VERIFICAR    → testes verdes + lint limpo + métricas na faixa + cobertura não caiu
7. COMITAR      → conventional commit, atômico e reversível
8. REGISTRAR    → `graft build` + atualizar §11 se a fila mudou
```

### 9.1 Durante a refatoração

- Preservar assinaturas públicas ou criar adapters.
- Não remover exports; se necessário, marcar `@deprecated`.
- Preservar edge cases (datas, moeda, timezone, RLS por empresa).
- Rodar `pnpm test` após **cada** extração.
- Um concern por commit; PR por arquivo/domínio.
- Não tocar `prisma/schema.prisma` e migrations na mesma refatoração de código.

### 9.2 Critérios de aceite (pós-refatoração)

- [ ] `pnpm test` 100% verde
- [ ] `pnpm lint` sem novos erros
- [ ] `npx next build` sem novos erros
- [ ] Cobertura do arquivo **mantida ou melhorada** (ratchet §3.4)
- [ ] Arquivo dentro dos limites §4; função ≤ 30 linhas; **CC ≤ 10**
- [ ] Sem novo `any`, sem novo `console.*`, sem senha em log
- [ ] Fronteiras de tenant/empresa preservadas
- [ ] Teste manual do fluxo crítico afetado (quando aplicável)
- [ ] Code review aprovado por ≥ 1 peer
- [ ] `graft build` executado

❌ Se qualquer item falhar → **desfazer a refatoração**. Sem exceções.

### 9.3 Refatorações mecânicas

Renomeação de símbolos/variáveis, com suíte verde e lint limpo, pode ser aprovada sem review extra **se**:
- O diff não altera lógica de negócio nem shape de I/O.
- `pnpm test` + `pnpm lint` + `npx next build` passam.
- Nenhuma string de log/erro de usuário foi alterada sem equivalente.

### 9.4 Formato de commit (Conventional Commits, em PT — padrão do repo)

```bash
git commit -m "refactor: extrai handlers e _internals de api/dashboard

Baseline:
- Testes: 114 passando, 38.99% linhas
- Verificado: pnpm test && pnpm lint && npx next build

Mudanças:
- Extrai buildDashboardReport para handlers/dashboard.ts
- Extrai queries RLS para _internals/dashboard-query.ts
- route.ts de 164 para 82 linhas
- CC 15 -> 6; cobertura da rota 0% -> 70%

Parte da política de refatoração v1.0"
```

Tipos em uso: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

### 9.5 Proibições de processo

- **PROIBIDO** criar `BUILD_APPROVAL_*.md`, `TEST_APPROVAL_*.md`, `ALL_TESTS_APPROVED_*.md`. Aprovação vive no PR + CI (`AGENTS.md` §0).
- **PROIBIDO** `npm`/`npm install` (`AGENTS.md` §0).
- **PROIBIDO** `git commit --amend`, `--no-verify`, `-f`, `push --force`.
- **PROIBIDO** desabilitar regra de lint para calçar o diff.

---

## 10. Anti-Patterns Proibidos

| Anti-Pattern | Exemplo no PROT | Solução |
|-------------|-----------------|---------|
| God File | `protheus-rest-client.ts` com auth + retry + parse + mock | Dividir por responsabilidade (`_internals/`) |
| Shotgun Surgery | Mudar cliente + adapter + engine ao corrigir 1 bug | Extrair contrato `ProtheusClient` (já existe) |
| Dependência circular | `integration` ↔ `db` ↔ `auth` | Injetar dependência / factory |
| Duplicação de fonte | `components/ui/*` e `src/components/ui/*` | Uma única fonte em `src/` |
| `if (empresa)` na UI | Componente consultando 3 endpoints por perfil | Extrair para hook com estratégia por domínio |
| Segredo em log | token Protheus em `console` | `crypto-vault` + `logIntegration` redigido |
| Magic Number | `60 * 1000` de TTL de token | Constante nomeada |
| Deep Nesting | 4 níveis em parse de resposta | Early returns + funções de 1 nível |
| Any chain | `const r: any = await res.json()` | `unknown` + Zod/type guard |
| Sleep-based retry | `await sleep(2000)` em retry de 401 | Backoff com jitter + limite de tentativas |

---

## 11. Fila de Refatoração (medida em Outubro/2026)

**Medição:** `readFileSync(p,'utf8').split('\n').length` sobre `.ts`/`.tsx` em `src/`, `components/`, `lib/` (exclui `node_modules`, `.next`, `coverage`). Complexidade via ESLint `complexity` (§12.3).
**Universo:** 87 arquivos-fonte + 18 arquivos de teste.
**Baseline do gate (Out/2026, pós Fase 1):** 24 arquivos de teste, **165 testes verdes**, **50.97% linhas** (`docs/reports/coverage-2026-10.txt`); `pnpm test` + `pnpm lint` (0 erros) + `npx tsc --noEmit` + `npx next build` verdes; `pnpm test:coverage` exit 0 com os thresholds da §3.4. (Fase 0 registrava 115 testes / 38.99%.)

### 11.1 🔴 CRÍTICA — Bloqueia merge

| Arquivo | Linhas | CC máx. | Cobertura | Ação |
|---------|--------|--------|-----------|------|
| `src/lib/integration/protheus-rest-client.ts` | **440** | 20 | 52.08% | Extrair: `rest-auth.ts`, `rest-retry.ts`, `rest-parse.ts`, `rest-mock.ts` em `_internals/` |
| `src/lib/integration/sync-engine.ts` | **286** | — | 42.99% | Extrair por agregado: `sync-clientes.ts`, `sync-faturamento.ts`, `sync-contas-receber.ts`, `sync-baixas.ts` |

### 11.2 🟠 ALTA — Decompor antes do merge

| Arquivo | Linhas | CC | Cobertura | Ação |
|---------|--------|----|-----------|------|
| `src/app/api/protheus/empresa/route.ts` | 200 | **36** | 56.89% | 🔴 por CC; `handlers/` + `_internals/` |
| `src/lib/integration/protheus-adapter.ts` | 78 | **23 / 18 / 11** | 100% ✅ (Fase 1) | 🔴 por CC; 1 função por entidade |
| `src/app/dashboard/page.tsx` | — | **22** | 85.71% | Extrair para `components/dashboard/` |
| `src/lib/integration/protheus-rest-client.ts` (fn) | — | 20 / 19 / 14 | — | Evincer com §11.1 |
| `src/components/dashboard/DashboardChartsGrid.tsx` | — | 18 | 100% | Extrair série de gráfico por hook |
| `src/app/api/dashboard/route.ts` | 164 | 15 | 100% ✅ (Fase 1) | `handlers/dashboard.ts` + `_internals/dashboard-query.ts` |
| `src/app/api/upload/route.ts` | **136** | — | 100% ✅ (Fase 1) | Acima do limite de 120 (§4); extrair parse/validação p/ `handlers/` + `_internals/` |
| `src/lib/auth.ts` | 93 | 12 | 88.24% | Extrair callbacks de token para `auth/claims.ts` |
| `src/lib/integration/protheus-soap-client.ts` | **172** | — | **0%** | 🟡 gatilho §5 (150+): planejar divisão; limite de client (200) ainda ok |

> **11 funções com CC > 10** medidas (total: 11). Nenhuma com CC ≥ 16 exceto as acima; após as duas extrações 🔴 a fila deve ficar zerada.

### 11.3 🟡 Dívida Estrutural — pagar antes de ampliar a base

| Item | Evidência | Ação | Status |
|------|-----------|------|--------|
| Raízes duplicadas | `components/ui/*` (4 arquivos) e `lib/utils.ts` (1) sem nenhum import em todo o repo; `components.json` aponta para `@/components` e `@/lib/utils` | **Deletar** `components/` e `lib/` da raiz | ✅ Fase 0 — deletadas (`git rm`), gate revalidado (tsc/build/test verdes) |
| `cn` importado de `"cn"` | `src/components/ui/{button,input}.tsx` e `src/lib/utils.ts` re-exportam o pacote `cn` em vez de usar `@/lib/utils` como fonte única | Apontar todos os imports para `@/lib/utils` | ⬜ Pendente (mecânico, §9.3) |
| Coverage gate vermelho | `pnpm test:coverage` saía 1 (38.99% < 80%) e o CI rodava **só** esse comando; pior: o workflow disparava em `main` e o branch do repo é `master`, **nunca rodava** | Rampa §3.4: thresholds = real − 2 + globs por diretório | ✅ Fase 0 — exit 0; CI agora roda `prisma generate` + coverage + lint + tsc + `next build`, e dispara em `master` |
| Rotas sem teste | `api/dashboard` 0%, `api/upload` 0%, `api/protheus/pull` 0% | Cobertura mínima §3.3 | ✅ Fase 1 — as 3 rotas (e `protheus-adapter`, `pull-and-sync`, `protheus-client-factory`) agora com **100% de linhas** e testes de caracterização; global 38.99% → 50.97% |
| Grafo de contexto | `graft/` só tinha `.cache/telemetry-repo-id.json` | Rodar `graft build` | ✅ Fase 0 — 108 arquivos, 377 nós, `graft/INDEX.md` gerado. **Não versionar:** `graft/` é cache local (`.gitignore /graft/` e o próprio `graft build` dizem "teammates run `graft build`") |
| `.env.example` incompleto e ignorado | `INGEST_API_KEY` e `PROTHEUS_CRED_ENCRYPTION_KEY` usados em código, ausentes; e o padrão `.env*` do `.gitignore` **impedia o commit do arquivo** | Documentar (sem valor real) e un-ignorar | ✅ Fase 0 — variáveis documentadas, `!.env.example` adicionado ao `.gitignore`, arquivo versionado |

### 11.4 Fora do escopo de `src/`

| Arquivo | Linhas | Observação |
|---------|--------|------------|
| `prisma/seed.ts` | 269 | Dividir por modelo se tocar |
| `prisma/schema.prisma` | 181 | 9 modelos — migrar com caution, uma mudança por vez |

### 11.5 Regenerar a fila

```powershell
node -e "const fs=require('fs'),p=require('path');const w=(d,o=[])=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.next','coverage'].includes(e.name))continue;const f=p.join(d,e.name);e.isDirectory()?w(f,o):/\.tsx?$/.test(e.name)&&!/\.test\.|\.d\.ts$/.test(e.name)&&o.push([f,fs.readFileSync(f,'utf8').split('\n').length])}return o};w('src').concat(w('components'),w('lib')).sort((a,b)=>b[1]-a[1]).filter(([,n])=>n>150).forEach(([f,n])=>console.log(n,f))"
```

```powershell
# Complexidade por função (violações > 10)
npx eslint --rule '{"complexity":["error",10]}' --format json src
```

> **Lições registradas do repositório de referência:** `Measure-Object -Line` do PowerShell **subconta linhas em branco** — use `split('\n').length`. ESLint flat config sem `files` explícito **ignora `.tsx`** — o comando acima usa o config do projeto e funciona.

---

## 12. Ferramentas

### 12.1 Comandos do projeto

| Finalidade | Ferramenta | Comando |
|-----------|------------|---------|
| Testes | Vitest | `pnpm test` |
| Cobertura | @vitest/coverage-v8 | `pnpm test:coverage` |
| Build | Next.js | `npx next build` |
| Lint | ESLint 9 (flat, `eslint-config-next`) | `pnpm lint` |
| Tipos | TypeScript | `npx tsc --noEmit` |
| Complexidade por função | ESLint `complexity` | `npx eslint --rule '{"complexity":["error",10]}' --format json src` |
| Duplicação | jscpd | `npx jscpd src` |
| Tamanho | Node one-liner | §11.5 |
| Grafo de contexto | graft | `graft build` / `graft ask "<pergunta>"` |
| Prisma | Prisma CLI | `npx prisma migrate dev --name <descricao_curta>` |

### 12.2 Scripts ausentes (criar quando a fila começar)

Recomenda-se adicionar `scripts/check-quality.mjs` (linhas por arquivo + CC por função, falhando no CI) e o script `typecheck` no `package.json`. O `eslint.config.mjs` atual **não tem** regra `complexity` nem `max-lines` — enquanto não forem adicionadas, a medição é manual (§11.5).

### 12.3 Extensões recomendadas

- **CodeMetrics** — complexidade inline
- **TODO Highlight** — Debt items da §11
- **Import Cost** — peso de imports

---

## 13. Contexto Multi-Agente

- **SRP por agente:** cada agente atua **apenas** no seu domínio. Mudança cross-cutting exige handoff explícito.
- **Context isolation:** não vazar arquivos entre domínios de agente (§6).
- **Handoffs:** `@qa → @frontend` (falha com repro), `@frontend → @arquitetura` (decisão estrutural), `@backend → @frontend` (API pronta).
- **Gate compartilhado:** nenhum agente marca tarefa "refatorada" sem `pnpm test` verde reportada.

**Output contract de toda refatoração:**
1. O que foi feito;
2. Arquivos tocados (+ linhas antes/depois);
3. Baseline de testes e cobertura antes/depois;
4. Handoff sugerido (se aplicável).

---

## 14. Code Review Checklist

- [ ] Arquivo dentro do limite §4 (componente ≤ 100, route ≤ 120, client ≤ 200)?
- [ ] **CC ≤ 10** por função?
- [ ] Funções ≤ 30 linhas, ≤ 3 parâmetros, nesting ≤ 2?
- [ ] `route.ts` só faz HTTP (regras em `handlers/` + `_internals/`)?
- [ ] Nenhum `any`, nenhum `console.*`, nenhum segredo em log?
- [ ] `try/catch` em toda operação assíncrona com API/DB/arquivo?
- [ ] Um único `new PrismaClient` / `new ProtheusRestClient` (via factory)?
- [ ] Fronteiras de tenant/empresa preservadas (`withEmpresaRLS`, sessão)?
- [ ] Testes de caracterização existem e a cobertura não caiu?
- [ ] Migração nova (se houver) segue §7.5?
- [ ] `graft build` executado e a §11 atualizada?

---

## 15. Documentação Relacionada

- `AGENTS.md` — premissas de programação (geração, SOLID, Clean Architecture, padrões)
- `docs/protheus-integracao-decisao.md` — decisão arquitetural da integração Protheus
- `prisma/schema.prisma` — fonte de verdade do modelo de dados
- `.env.example` — contrato de variáveis de ambiente
- `docs/reports/coverage-<AAAA-MM>.txt` — baselines de cobertura trimestrais
- `graft/INDEX.md` — grafo de contexto (gerado por `graft build`)

---

## 16. Revisão e Atualização

Revisar trimestralmente e atualizar conforme: padrões da indústria, mudanças de stack, lições de refatorações, feedback do time.

> Qualquer refatoração que não melhore legibilidade ou manutenibilidade deve ser revertida. O objetivo é **clareza**, não código "novo".

**Última atualização:** Outubro 2026 (v1.0 — criada a partir da política Omni-Reporte v4.0, adaptada à stack PROT; fila medida com 2 arquivos 🔴, 11 funções com CC > 10, cobertura global 38.99%)
**Fase 0 aplicada (Out/2026):** rampa §3.4 ligada (exit 0), CI completo (coverage + lint + tsc + build), `components/` e `lib/` da raiz deletados, `.env.example` versionado com as 2 variáveis que faltavam, `graft build` executado. Baseline: 18 arquivos de teste, 115 testes, 38.99% linhas.
**Fase 1 aplicada (Out/2026):** testes de caracterização dos alvos 0% — `protheus-adapter`, `api/dashboard`, `api/upload`, `api/protheus/pull`, `pull-and-sync`, `protheus-client-factory` (50 testes, todos a 100% de linhas); thresholds subidos (ratchet) para 48/48/46/39 globais. Baseline: 24 arquivos de teste, 165 testes, 50.97% linhas. Nenhuma linha de código de produção alterada.
**Próxima revisão:** Janeiro 2027