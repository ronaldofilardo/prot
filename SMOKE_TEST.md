# Smoke Test Manual — PROT

## Objetivo
Validar fluxos críticos de UI/UX após refatoração de componentes (Fase 5) e integração Protheus (Fases 2–3). Executar antes de deploy em staging.

**Duração estimada:** 5–7 minutos  
**Ambiente:** `pnpm dev` (localhost:3000)  
**Prerequisitos:** .env.local com `INGEST_API_KEY` e `PROTHEUS_CRED_ENCRYPTION_KEY` válidas

---

## 1. Fluxo de Login e Autenticação (Fase 4b: `lib/auth-claims.ts`)

- [ ] Acessar http://localhost:3000
- [ ] Clicar em "Entrar com Google" (ou provedor configurado)
- [ ] Confirmar que redirect funciona e JWT é armazenado
- [ ] Verificar no DevTools (`Application` > `Cookies`) que `next-auth.session-token` existe
- [ ] Recarregar página — sessão persiste sem novo login

**Esperado:** Usuário autenticado, banner/menu muda para modo logado.

---

## 2. Dashboard — Renderização de Gráficos (Fase 5a-5b: `app/dashboard/page.tsx`, `DashboardChartsGrid.tsx`)

- [ ] Navegue para `/dashboard`
- [ ] Aguarde ~2s carregar dados da API
- [ ] Verificar se os 4 gráficos aparecem (sem erros no console):
  - [ ] **Faturamento Mensal** (linha)
  - [ ] **Projeção 30 Dias** (barra)
  - [ ] **Contas a Receber por Status** (pizza)
  - [ ] **Clientes Top 5** (tabela)
- [ ] DevTools > Console: nenhum erro vermelho `Failed to fetch`, `undefined is not a function`, ou `any`
- [ ] DevTools > Network: todos requests para `/api/dashboard/*` retornam 200/204

**Esperado:** Dashboard carrega em < 3s, gráficos renderizam com dados reais, console limpo.

---

## 3. Upload de Arquivo (Fase 3c: `api/upload/route.ts` ≤120 linhas)

- [ ] Clicar em "Importar Arquivo" (ou botão equivalente de upload)
- [ ] Selecionar um arquivo válido (ex: `.csv`, `.xlsx` — conforme suportado)
- [ ] Observar barra de progresso (se implementada)
- [ ] Após ~2s, verificar toast/notificação de sucesso
- [ ] DevTools > Network: POST `/api/upload` retorna 200 com `{ uploadId, filename, size }`
- [ ] Arquivo aparece na lista de importações recentes

**Esperado:** Upload funciona, resposta 200, UI reflete sucesso.

---

## 4. Sincronização Protheus (Fase 2: `sync-engine.ts` ≤200 linhas, `protheus-rest-client.ts` ≤200 linhas)

- [ ] Navegue para área de "Sincronização" ou "Integração Protheus"
- [ ] Clicar em "Sincronizar Agora" ou equivalente
- [ ] Observar status: "Sincronizando..." → "Concluído" ou erro
- [ ] DevTools > Network: GET `/api/protheus/pull` retorna 200 com `{ status: 'ok', recordsProcessed: N, errors: [] }`
- [ ] Logs no servidor (stderr/stdout) mostram `logSync*` com timestamps (não `console.log` solto)
- [ ] Após sucesso, dados aparecem na dashboard (novos registros em tabelas/gráficos)

**Esperado:** Sync completa sem erro, resposta JSON válida, dados refletem no dashboard.

---

## 5. Empresa/Tenant RLS (Fase 3a: `api/protheus/empresa/route.ts` CC ≤10)

- [ ] Login com usuário de **empresa A**
- [ ] Navegue para `/empresa` (ou seção de empresas)
- [ ] Confirmar que dados mostrados pertencem **apenas** a empresa A
- [ ] Logout e login com usuário de **empresa B**
- [ ] Confirmar dados agora mostram **apenas** empresa B
- [ ] DevTools > Network: ambos requests trazem `empresaId` correto no header/cookie (RLS aplicado)

**Esperado:** Dados isolados por tenant, sem vazamento entre empresas.

---

## 6. Tratamento de Erros e Timeouts (Fase 2a: `rest-retry.ts` com `PROTHEUS_FETCH_TIMEOUT_MS = 8000`)

- [ ] Desconectar internet ou simular latência alta (DevTools > Network > throttling: "Slow 3G")
- [ ] Tentar sincronização ou acesso à API
- [ ] Verificar que erro é exibido em < 9s (timeout + overhead)
- [ ] Message de erro é legível ("Timeout ao conectar Protheus") — **não expõe stack trace interno**
- [ ] Logger mostra tentativas (se backoff/retry aplicado, ver múltiplas linhas com jitter)

**Esperado:** Timeout tratado corretamente, mensagem clara, sem crash de UI.

---

## 7. Build e Cobertura (Fase 0: Gate Verde)

Antes de fechar smoke test:

```bash
pnpm test:coverage
pnpm lint
npx tsc --noEmit
npx next build
```

- [ ] Todos 4 comandos exitCode 0
- [ ] Coverage na faixa esperada (linhas ≥ 80, branches ≥ 80)
- [ ] Build finaliza sem erros ou warnings críticos

**Esperado:** CI/build pipeline verde.

---

## Checklist de Saída

- [ ] Todos 7 fluxos executados com sucesso
- [ ] Console limpo (0 erros, 0 `console.log` soltos, 0 `any`)
- [ ] DevTools Network mostra requests corretos
- [ ] Build verde
- [ ] Nenhuma regressão visual em componentes refatorados

**Se algum item falhar:** registrar erro, revert última PR, investigar no `graft ask`.

---

**Assinado:** Smoke Test Manual v1 — Pós-Fase 5 (refatoração completa)  
**Data:** 2026-01 (baseline)  
**Próxima revisão:** Antes de deploy em produção