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
| `src/lib/utils/**` | 97.33% | 90% | 90% |
| `src/lib/security/**` | 95.83% | 90% | 90% |
| `src/lib/auth*.ts` (`auth.ts` + `auth-claims.ts`) | 89.19% | 80% | 80% |
| `src/lib/integration/**` | 83.54% | 55% | 55% (atingido) |
| `src/hooks/**` | 99.48% | 30% | 30% |
| `src/components/**` | 97.02% | 30% | 30% |
| `src/app/api/**` | 91.28% | 60% | 60% |
| **Global** | **90.70% linhas / 90.50% stmts / 92.40% funcs / 81.30% branches** | **80 / 79 / 80 / 80** | **meta 80% atingida (Fase 6); nunca reduzir** |

> **Como estes números foram medidos:** agregação recursiva sobre `coverage/lcov.info` (cobertura de todos os arquivos sob o diretório). Os valores anteriores desta tabela (ex.: `src/lib/utils/**` = 96.45%) vinham das linhas de diretório do relatório texto, que **não agrega subdiretórios** — por isso `src/lib/utils/charts/*` (0%) não contava. O threshold em `vitest.config.mts` usa o globo recursivo, então vale o número daqui.

> **Previsão da v1.0 corrigida pela medição (Fase 1):** a nota original dizia que cobrindo `sync-engine`, `protheus-adapter`, `pull-and-sync`, `protheus-client-factory` e as rotas `dashboard`/`upload`/`protheus/pull` a global passaria de 80% com ~35 testes. **Falso:** Fase 1 cobriu 5 desses 6 alvos (50 testes) e a global foi de 38.99% → **50.97%**; a Fase 2 dividiu `sync-engine` e `protheus-rest-client` (global → **53.04%**). O restante até 80% exige sobretudo os `hooks/**` (18.13%) e `components/**` (8.23%), além de `protheus-soap-client` (0%) e `empresa/route.ts` (CC 36 — dividida na Fase 3).

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
**Universo:** 114 arquivos-fonte + 43 arquivos de teste (Fase 7; era 110 + 41 na Fase 6, 110 + 24 na Fase 5, 107 + 24 na Fase 4, 105 + 24 na Fase 3, 87 + 18 na medição inicial).
**Baseline do gate (Out/2026, pós Fase 7):** 43 arquivos de teste, **309 testes verdes**, **90.73% linhas** (`docs/reports/coverage-2026-10.txt`, regenerado na Fase 6 com 90.70%); `pnpm test` + `pnpm lint` (0 erros) + `pnpm check-quality` + `pnpm typecheck` + `npx next build` verdes; `pnpm test:coverage` exit 0 com os thresholds da §3.4 (80/79/80/80 globais). (Fase 6: 41 arquivos / 309 testes / 90.70%; Fase 5: 24 / 166 / 54.64%; Fase 4: 165 testes / 54.19%; Fase 3: 165 testes / 53.81%; Fase 2: 165 testes / 53.04%; Fase 1: 165 testes / 50.97%; Fase 0: 115 testes / 38.99%.)

### 11.1 🔴 CRÍTICA — Bloqueia merge

| Arquivo | Linhas | CC máx. | Cobertura | Ação |
|---------|--------|--------|-----------|------|
| `src/lib/integration/protheus-rest-client.ts` | **177** (era 440) | **9** (era 20) | 69.23% | ✅ Fase 2 — extraído para `_internals/rest-{types,paths,auth,retry,parse,mock}.ts`; nenhuma função > 30 linhas |
| `src/lib/integration/sync-engine.ts` | **20** (era 286) | — | dir 62.53% | ✅ Fase 2 — fachada; `_internals/sync-{types,parsers,resolve,clientes,faturamento,contas-receber,baixas}.ts` (maior função: 30 linhas) |

### 11.2 🟠 ALTA — Decompor antes do merge

| Arquivo | Linhas | CC | Cobertura | Ação |
|---------|--------|----|-----------|------|
| `src/app/api/protheus/empresa/route.ts` | **66** (era 200) | **≤10** (era 36) | 56.89% | ✅ Fase 3 — `handlers/empresa.ts` + `_internals/{empresa-query,token-info,filiais}.ts` |
| `src/lib/integration/protheus-adapter.ts` | **72** (era 78) | **≤3** (era 23 / 18 / 11) | 100% ✅ (Fase 1) | ✅ Fase 4 — `?.trim()`/`\|\|` extraídos para `_internals/adapter-fields.ts` (`trimField`/`trimOr`/`parseProtheusDate`) |
| `src/app/dashboard/page.tsx` | **50** (era 110) | **≤6** (era 22) | 100% ✅ | ✅ Fase 5 — `DashboardErrorState` + `DashboardTabPanel` + puras `dashboard-tab-data.ts` (`buildChartsData`/`buildKpiData`) |
| `src/lib/integration/protheus-rest-client.ts` (fn) | — | 20 / 19 / 14 | — | ✅ Fase 2 — CC máx. 9 (evincido com a §11.1) |
| `src/components/dashboard/DashboardChartsGrid.tsx` | **91** | **≤7** (era 18) | 100% ✅ | ✅ Fase 5 — seções `FaturamentoCharts`/`ProjecaoCharts` (DOM, testids e 4 skeletons idênticos) |
| `src/app/api/dashboard/route.ts` | **37** (era 164) | **≤10** (era 15) | 100% ✅ (Fase 1) | ✅ Fase 3 — `handlers/dashboard.ts` + `_internals/dashboard-query.ts` |
| `src/app/api/upload/route.ts` | **30** (era 136) | — | 100% ✅ (Fase 1) | ✅ Fase 3 — `handlers/upload.ts` + `_internals/{csv-detect,csv-parse,upload-sync}.ts` |
| `src/lib/auth.ts` + `auth-claims.ts` | **52 + 68** (era 93) | **≤8** (era 12) | auth.ts 100% ✅ | ✅ Fase 4 — `authorize` (41 linhas, CC 12) → `src/lib/auth-claims.ts` (irmão; `lib/auth/` proibido por colisão de resolução); callbacks jwt/session permanecem em `auth.ts` |
| `src/lib/integration/protheus-soap-client.ts` | **115** (era 172) | **≤10** | 100% ✅ | ✅ Fila §11 (Out/2026) — XML da §5 → `_internals/soap-xml.ts` (`ROW_TAG`/`buildConsultaEnvelope`/`parseSoapRows`); mesmos 8 testes |

> **0 funções com CC > 10** — fila de complexidade **zerada na Fase 5** (era 2 após a Fase 4, 6 antes dela, 8 na Fase 3, 11 na medição inicial) e **agora bloqueada pelo gate** (regra `complexity` no ESLint + `pnpm check-quality`, Fase 7). Restam **35 funções > 30 linhas** em produção como dívida conhecida (medição Fase 7 via ESLint `max-lines-per-function`; era 33 — as extrações da Fase 7 criaram `FiliaisPanel`/`FilterFields` ainda > 30) — maioria é exibição pura (skeletons/labels), sem risco; endereçar ao mexer no arquivo. Maiores: `buildProjecaoAreaOption` (111), `useUploadPanel` (99), `useEmpresaProtheus` (93).

### 11.3 🟡 Dívida Estrutural — pagar antes de ampliar a base

| Item | Evidência | Ação | Status |
|------|-----------|------|--------|
| Raízes duplicadas | `components/ui/*` (4 arquivos) e `lib/utils.ts` (1) sem nenhum import em todo o repo; `components.json` aponta para `@/components` e `@/lib/utils` | **Deletar** `components/` e `lib/` da raiz | ✅ Fase 0 — deletadas (`git rm`), gate revalidado (tsc/build/test verdes) |
| `cn` importado de `"cn"` | `src/components/ui/{button,input}.tsx` e `src/lib/utils.ts` re-exportam o pacote `cn` em vez de usar `@/lib/utils` como fonte única | Apontar todos os imports para `@/lib/utils` | ✅ Fila §11 (Out/2026) — `button.tsx`/`input.tsx` apontados para `@/lib/utils` (`table`/`card`/`badge` já usavam); fonte única mantida em `src/lib/utils.ts` |
| Coverage gate vermelho | `pnpm test:coverage` saía 1 (38.99% < 80%) e o CI rodava **só** esse comando; pior: o workflow disparava em `main` e o branch do repo é `master`, **nunca rodava** | Rampa §3.4: thresholds = real − 2 + globs por diretório | ✅ Fase 0 — exit 0; CI agora roda `prisma generate` + coverage + lint + tsc + `next build`, e dispara em `master` |
| Rotas sem teste | `api/dashboard` 0%, `api/upload` 0%, `api/protheus/pull` 0% | Cobertura mínima §3.3 | ✅ Fase 1 — as 3 rotas (e `protheus-adapter`, `pull-and-sync`, `protheus-client-factory`) agora com **100% de linhas** e testes de caracterização; global 38.99% → 50.97% |
| Grafo de contexto | `graft/` só tinha `.cache/telemetry-repo-id.json` | Rodar `graft build` | ✅ Fase 0 — 108 arquivos, 377 nós, `graft/INDEX.md` gerado. **Não versionar:** `graft/` é cache local (`.gitignore /graft/` e o próprio `graft build` dizem "teammates run `graft build`") |
| `.env.example` incompleto e ignorado | `INGEST_API_KEY` e `PROTHEUS_CRED_ENCRYPTION_KEY` usados em código, ausentes; e o padrão `.env*` do `.gitignore` **impedia o commit do arquivo** | Documentar (sem valor real) e un-ignorar | ✅ Fase 0 — variáveis documentadas, `!.env.example` adicionado ao `.gitignore`, arquivo versionado |

### 11.4 Fora do escopo de `src/`

| Arquivo | Linhas | Observação |
|---------|--------|------------|
| `prisma/seed.ts` | 269 | Dividir por modelo se tocar; `main()` tem CC 28 — regra `complexity` desligada para `prisma/**` (§12.2), limite da §4.1 (300) ok |
| `prisma/schema.prisma` | 181 | 9 modelos — migrar com caution, uma mudança por vez |

### 11.5 Regenerar a fila

> **Fase 7:** o gate de linhas por arquivo + CC é automatizado (`pnpm check-quality`); os comandos abaixo servem para medição ad-hoc e para a fila de funções > 30 linhas (fora do gate).

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
| Tipos | TypeScript | `pnpm typecheck` (alias de `tsc --noEmit`) |
| Guardrail (linhas por arquivo + CC ≤ 10) | `scripts/check-quality.mjs` (ESLint API) | `pnpm check-quality` (exit 1 em violação; roda no CI) |
| Complexidade por função | ESLint `complexity` (≤ 10, embutido no lint) | `pnpm lint` |
| Duplicação | jscpd | `npx jscpd src` |
| Tamanho | Node one-liner (adi-hoc) | §11.5 (`pnpm check-quality` cobre o gate) |
| Grafo de contexto | graft | `graft build` / `graft ask "<pergunta>"` |
| Prisma | Prisma CLI | `npx prisma migrate dev --name <descricao_curta>` |

### 12.2 Guardrails automáticos (Fase 7)

`scripts/check-quality.mjs` (**`pnpm check-quality`**) é o gate descrito na §12.2 original e roda no CI:

- **Linhas por arquivo** (§4.1, por categoria): componente 100, página 150, route 120, hook 120, client 200, utilitário 120, teste 250 — falha com `exit 1`;
- **CC ≤ 10 por função** (§4) via API do ESLint (`overrideConfig`), falha com `exit 1`.

Complementos: o script `typecheck` existe no `package.json`; o `eslint.config.mjs` aplica `complexity: ["error", 10]` para todo o projeto **exceto `prisma/**`** (`seed.ts` é "fora do escopo de `src/`" na §4.1 — CC 28 registrado na §11.4) e ignora `.kilo/`, `coverage/` e `graft/` (artefatos não-fonte). Os 6 arquivos que estouravam os limites do gate foram adequados na Fase 7 (§16). Medição manual (fallback): §11.5.

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
**Fase 2 aplicada (Out/2026):** extração dos dois arquivos 🔴 — `protheus-rest-client.ts` 440 → 177 linhas (CC máx. 20 → 9) em `rest-{types,paths,auth,retry,parse,mock}.ts`; `sync-engine.ts` 286 → 20 linhas (fachada) em `sync-{types,parsers,resolve,clientes,faturamento,contas-receber,baixas}.ts`, com as 4 funções > 30 linhas decompostas em upserts/helpers. API pública e comportamento preservados (165/165 testes); ratchet global para 51/50/48/41 (53.04% linhas). Commits `7d5ca36`, `d348b96`.
**Fase 3 aplicada (Out/2026):** as 3 rotas acima de 120 linhas divididas no padrão §7.2/§8.3 (`route.ts` → `handlers/` + `_internals/`): `protheus/empresa` 199 → 66 (GET CC 36 → ≤10; `_internals/token-info.ts` deduplica o fallback de token), `dashboard` 163 → 37 (CC 15 → ≤10), `upload` 135 → 30 (POST 77 → ≤16). Mesmos payloads/msgs/logs/ordem de chamada (404 do Protheus ainda antes da chamada externa); 165/165 testes; ratchet global para 51/51/50/41 (53.81% linhas; `src/app/api/**` 83.08%). Commits `3e73314`, `d58e59c`, `37546b8`.
**Fase 4 aplicada (Out/2026):** fila de CC > 10 em `lib/` eliminada + 5 funções > 30 linhas decompostas: `protheus-adapter.ts` CC 23/18/11 → ≤3 (helpers em `_internals/adapter-fields.ts`, sem testes alterados — `externalId` ainda propaga `"undefined"`), `authorize` → `lib/auth-claims.ts` (`extrairCredenciais` + `validarCredenciais`; irmão de `auth.ts` para não colidir na resolução), `getProtheusClient` 40 → 13 linhas (`opcoesRestOauth` + `clientFromCredencial`), `fetchNewToken` 43 → 10 + `getValidToken` 33 → 16 (`executeTokenRequest` + `interpretTokenResponse`), `pullAndSyncFromProtheus` 58 → 13 (`executarJob` + `registrarFalha`). 165/165 testes; ratchet global para 51/41/51/52 (54.19% linhas / 42.10% branches — branches caiu 1.8pp com os novos pontos de decisão, ainda acima do floor 41); globo de auth na §3.4 ampliado para `src/lib/auth*.ts` (89.19% combinado ≥ floor 80). Commits `59f1736`, `c4800ea`, `4b9c973`, `982df73`, `21290e2`.
**Fase 5 aplicada (Out/2026):** os 2 últimos alvos de CC > 10, **zerando a fila de complexidade**: `dashboard/page.tsx` DashboardContent CC 22 → 6 (110 → 50 linhas) com `DashboardErrorState`, `DashboardTabPanel` (CC 7) e puras `buildChartsData`/`buildKpiData` em `components/dashboard/dashboard-tab-data.ts`; `DashboardChartsGrid.tsx` CC 18 → 7 (91 linhas) com seções `FaturamentoCharts`/`ProjecaoCharts`. DOM, props, testids e 4 skeletons idênticos; +1 teste de caracterização do estado de erro (166 testes; `page.tsx` 85.71% → 100%); ratchet global para 52/41/52/52 (54.64% linhas; glob `src/components/**` 6 → 11, real 8.23% → 13.69%). Commits `3d43a33`, `cba9c8f`.
**Fase 6 aplicada (Out/2026):** rampa de cobertura até a meta de 80% — **6 batches, +143 testes (166 → 309)**: 6a `lib/utils/charts` (fachada `dashboardCharts`: temas, formatters, donut, projeção); 6b `components/charts` (echarts mockado + `useTheme` mockado) e `components/ui` (Table/Card/Badge/Button/Input); 6c hooks `useLogin` (6), `useTheme` (3, `matchMedia` stubado) e `useDashboard` (7, `useFilters` real + debounce 350ms com timers fake); 6d `useEmpresaProtheus` (11, carga/sincronização com timers fake) e `useUploadPanel` (+10: drop, upload, falhas); 6e componentes — `dashboard-widgets` (12), `dashboard-filters` (10), `empresa-cards` (14), `empresa-protheus-panel` (4, integração com fetch), `upload-sections` (8) e `login-form` (5), com `vitest-setup.ts` migrado para `@testing-library/jest-dom/vitest` (matchers tipados); 6f `sync-baixas` (5), `sync-contas-receber` (5), `protheus-soap-client` (7: envelope, auth, SOAP Fault, factory) e `token-info` (12: JWT, fallbacks, `empresaFromTokenInfo`). Global: **54.64% → 90.70% linhas / 81.30% branches**; ratchet para **80/79/80/80** + globs (hooks 16 → 30, components 11 → 30, utils 70 → 90). Descobertas cobertas: `hooks` 156/156, `components` 147/147, `charts`/`utils` 81/81, integration 96/96. Commits `984ad7b`, `da21908`, `8f0dc55`, `4fb9649`, `f7e98ac`, `7b6c219`.
**Fase 7 aplicada (Out/2026):** guardrails automáticos (§12.2) — `scripts/check-quality.mjs` (`pnpm check-quality`: linhas por arquivo §4.1 + CC ≤ 10 via ESLint API; exit 1 em violação; **testado com 2 testes negativos** — arquivo > limite e função CC 12 — e removidos em seguida), script `typecheck` no `package.json`, step `pnpm check-quality` no CI (`npx tsc --noEmit` → `pnpm typecheck`) e regra `complexity: ["error",10]` no `eslint.config.mjs` (escopo: tudo exceto `prisma/**`, "fora do escopo de `src/`" pela §4.1; ignores `.kilo/`/`coverage/`/`graft/` — warnings de lint 12 → 3). Pré-requisito: **6 arquivos estouravam os limites da §4** e foram adequados com os testes existentes como rede de segurança — `useEmpresaProtheus.ts` 128 → 99 (interfaces → `empresa-protheus-types.ts` + re-export), `EmpresaFilialFilter.tsx` 132 → 85 (+`FiliaisPanel.tsx` 82), `DashboardFilterBar.tsx` 105 → 56 (+`FilterFields.tsx` 92), `empresa-grupo.ts` 124 → 43 (domínio hierarquia → `empresa-hierarquia.ts` com `export *`, sem ciclo; testes/dashboard importam sem mudança), `route.test.ts` 311 → 237 (+`route.grupos.test.ts`, 6 testes de escopo/hierarquia movidos) e `protheus-rest-client.test.ts` 262 → 162 (+`protheus-rest-client.empresa.test.ts`, 2 testes de empresa/filiais movidos; duplicação de `vi.mock` segue o padrão dos outros 7 arquivos de teste do repo). Gate completo: 43 arquivos / **309 testes**, lint 0 erros / 3 warnings, check-quality PASSOU, typecheck 0, build 0, coverage exit 0 (**90.73% linhas / 81.30% branches / 92.44% funcs**; thresholds 80/79/80/80 inalterados); universo 114 prod + 43 teste; fila de funções > 30 reavaliada: 35.
**Fila §11 executada (Out/2026):** os 2 itens prioritários pós-Fase 7 — (1) `cn` unificado em `@/lib/utils` (§11.3 ✅: `button.tsx`/`input.tsx` — `table`/`card`/`badge` já usavam); (2) `protheus-soap-client.ts` 171 → **115 linhas** (§11.2 ✅: XML → `_internals/soap-xml.ts` de 60 linhas, mesmo contrato público, 8/8 testes, 100% de linhas nos 2 arquivos); bônus: **lint 0 erros / 0 warnings** — os 3 warnings restantes eliminados sem mudança de comportamento (`_customPath` removido das stubs `fetchEmpresa`/`fetchFiliais` — a interface `ProtheusClient` mantém o parâmetro opcional e o único chamador `handlers/empresa.ts` passa pela interface — e `req` do middleware). Gate completo: 43 arquivos / **309 testes**, lint 0/0, check-quality PASSOU (158 arquivos), typecheck 0, build 0, coverage exit 0 (**90.73% linhas**). Commits `3291493`, `ed7c8a1`, `3b0f91f`.
**Próxima revisão:** Janeiro 2027