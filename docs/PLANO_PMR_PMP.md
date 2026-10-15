# Plano de Execução: PMR e PMP (Prazo Médio de Recebimento e de Pagamento)

> Destino no projeto: `docs/PLANO_PMR_PMP.md`.
> Em conformidade com AGENTS.md. Este documento não altera código.

---

## 1. Diretrizes e Premissas Aprovadas

1. **Prazo concedido (PMR e PMP)**: média de (vencimento − emissão), ponderada pelo valor do título.
2. **Prazo realizado e atraso (PMR e PMP)**: média de (baixa − emissão) ponderada pelo valor baixado, e média de (baixa − vencimento) ponderada pelo valor baixado. O PMP realizado foi aprovado e entra na Fase 3.
3. **Três fases**: Fase 1 só PMR sem sync novo; Fase 2 SE2 completa e PMP concedido; Fase 3 PMP realizado (baixas de pagamento da SE5), saldos em aberto e faixas a vencer.
4. **Tipos de título**: a lista de tipos é um cadastro do próprio ambiente Protheus (tabela do SX5 consultada pelo campo `E1_TIPO`/`E2_TIPO`, normalmente a 05, a confirmar no Configurador), então não existe padrão universal. Regra:
   - **Padrão por exclusão**: entram todos os tipos, exceto os que não são venda ou compra a prazo: tipos terminados em `-` (abatimentos e impostos retidos), `RA`, `NCC`, `PR`, `NDF` e `PA`.
   - **Sobrescrita por inclusão**: se `PROTHEUS_TIPOS_TITULO_RECEBER` / `PROTHEUS_TIPOS_TITULO_PAGAR` estiver definida, só esses tipos entram.
   - Motivo: uma lista de inclusão com padrão errado zera a métrica sem aviso; a exclusão, no pior caso, só distorce a média.
   - A resposta da API devolve a lista de tipos considerados e o valor total por tipo, e a UI mostra isso, para o CFO ver o que entrou no cálculo.
   - **Validação obrigatória antes de produção** (diagnóstico na seção 6).
5. **Fornecedor na v1**: nome vem de `E2_NOMFOR` e fica no próprio registro. A SA2 não é sincronizada.
6. **Atraso**: valor negativo significa pagamento antecipado. A UI deve rotular isso.
7. **Interface**: aba "Prazo Médio" no Dashboard, todos os componentes com menos de 100 linhas.
8. **Somente leitura no Protheus**: o sistema só consome dados. Todas as chamadas novas são `GET` de leitura (`genericQuery` em SE1, SE2 e SE5); nada é enviado, gravado ou alterado no Protheus. O `POST` de OAuth já existente serve só para obter o token e não carrega dados de negócio. Os novos `ContaPagar` e `BaixaPagar` existem apenas no banco do app.

### Fórmulas (domínio puro)

```
dias(a, b)         = round((b − a) / 86_400_000)            // datas em UTC 00:00
PMR concedido      = Σ(valor × dias(emissão, vencimento)) / Σ valor
PMR realizado      = Σ(valorBaixa × dias(emissão, baixa)) / Σ valorBaixa
Atraso médio       = Σ(valorBaixa × dias(vencimento, baixa)) / Σ valorBaixa
% pago em atraso   = Σ valorBaixa com baixa > vencimento / Σ valorBaixa × 100
PMP concedido      = Σ(valor × dias(emissão, vencimento)) / Σ valor   // ContaPagar
PMP realizado      = Σ(valorBaixa × dias(emissão, baixa)) / Σ valorBaixa   // BaixaPagar (Fase 3)
```

Denominador zero retorna `null` (a UI mostra "sem dados"), nunca 0.

---

## 2. Arquitetura da Solução

```
[Protheus SE1 / SE5 / SE2] ou CSV
       │
       ▼
[ProtheusClient REST] ──> genericQuery com paginação
       │
       ▼
[Adapters] ──> CanonicalTitle / CanonicalPayment
       │
       ▼
[Sync Engine] ──> upsert idempotente (ContaReceber, Baixa, ContaPagar)
       │
       ▼
[PostgreSQL + RLS empresa_isolation]
       │
       ▼
[/api/prazo-medio] ──> query (select mínimo) ──> metrics-prazo-medio.ts (funções puras)
       │
       ▼
[usePrazoMedio hook] ──> [src/components/prazo-medio/] (< 100 linhas por arquivo)
```

Padrão idêntico ao da aba Margem (`/api/margem`, `margem-query.ts`, `metrics-margem.ts`, `useMargem`).

---

## 3. Estrutura de Arquivos

### 3.1. Fase 1 (PMR, sem sync novo)

**Integração (correções pré-requisito da SE5, sem elas o PMR realizado fica errado)**
- `src/lib/integration/_internals/rest-paths.ts` **e `.env`**: incluir `E5_RECPAG` e `E5_SEQ` nos campos de baixas. O `.env` atual define `PROTHEUS_REST_BAIXAS_PATH` com lista própria de campos, e esse caminho tem prioridade sobre o fallback; alterar só o `rest-paths.ts` não teria efeito.
- `src/lib/integration/_internals/adapter-baixas-filter.ts` (novo): função pura que descarta linhas com `E5_RECPAG = 'P'`. Linha sem o campo é tratada como "receber", para não quebrar `mocks/protheus/SE5.csv`.
- `src/lib/integration/_internals/sync-jobs-config.ts`: aplicar o filtro na entidade `Baixa`.
- `src/lib/integration/_internals/rest-entity-fetchers.ts`: a chave de deduplicação de `fetchBaixas` usa `E5_CLIENTE`, `E5_LOJA` e `E5_SEQ`, campos que o path atual não pede; na prática duas baixas do mesmo título (pagamento parcial) viram uma só. Ajustar a chave para incluir `E5_FILIAL`, `E5_BAIXA` e `E5_SEQ`.
- `src/lib/integration/_internals/sync-baixas.ts` e `sync-parsers.ts`: a idempotência atual compara só título (prefixo, número, parcela), então a segunda baixa parcial do mesmo título é descartada como "já existe". Passar a considerar também data e sequência da baixa. **Decidido: coluna nova `sequencia` em `Baixa`.**
  - `prisma/schema.prisma`: `sequencia String?` em `Baixa` e chave única `[contaReceberId, sequencia, dataBaixa]`.
  - `prisma/migrations/20261015100000_add_baixa_sequencia/migration.sql`: `ADD COLUMN` nulável + índice único (sem perder as baixas já gravadas).
  - `canonical.ts`: `CanonicalPayment` ganha `sequence` e o adapter lê `E5_SEQ`; o `externalId` passa a incluí-lo.
  - Compatibilidade: baixa antiga com `sequencia` nula e mesma data e valor da baixa recebida é atualizada (recebe a sequência), em vez de duplicada. Baixa nova do mesmo título com data ou sequência diferente é inserida.
- `src/lib/integration/__tests__/sync-baixas.test.ts`: cobrir o caso de baixa antiga sem sequência.
- `mocks/protheus/SE5.csv`: adicionar as colunas `E5_RECPAG` e `E5_SEQ`, linhas `R`, uma `P`, e um título com duas baixas parciais.

**Domínio puro**
- `src/lib/utils/metrics-prazo-medio.ts`: `diasEntre`, `calcularPrazoConcedido`, `calcularPrazoRealizado`, `calcularAtraso`. Sem dependência de Prisma.

**API**
- `src/app/api/prazo-medio/types.ts`: DTOs de filtros e resposta.
- `src/app/api/prazo-medio/_internals/prazo-medio-query.ts`: `carregarTitulosReceber` e `carregarBaixasReceber` (somente campos necessários, filtrados por `empresaId` permitido, período, filial, cliente e tipo elegível).
- `src/app/api/prazo-medio/handlers/prazo-medio.ts`: `buildPrazoMedioReport` (mesma resolução de empresas e filiais da margem).
- `src/app/api/prazo-medio/route.ts`: `GET /api/prazo-medio`, com `try/catch` e `logApiError`.

**Frontend**
- `src/components/prazo-medio/types.ts`
- `src/components/prazo-medio/hooks/usePrazoMedio.ts`
- `src/components/prazo-medio/prazo-medio-component.tsx`
- `src/components/prazo-medio/common/PrazoCardsKpi.tsx` (PMR concedido, PMR realizado, atraso médio, % em atraso)
- `src/components/prazo-medio/common/PrazoGraficoMensal.tsx`
- `src/components/prazo-medio/common/PrazoTabelaClientes.tsx`
- `src/components/prazo-medio/utils/formatPrazo.ts`
- `src/components/prazo-medio/index.ts`
- `src/components/dashboard/DashboardSidebarNav.tsx`: `TabType` ganha `"prazo-medio"` e o item da aba.
- `src/components/dashboard/DashboardTabPanel.tsx`: renderiza `PrazoMedioComponent`.

### 3.2. Fase 2 (SE2 completa e PMP concedido)

**Banco**
- `prisma/schema.prisma`: model `ContaPagar` e relação em `Empresa`.
  - Campos: `filial`, `prefixo`, `numero`, `parcela`, `tipo`, `fornecedorCodigo`, `fornecedorLoja`, `fornecedorNome`, `dataEmissao`, `vencimento`, `valor` (`Decimal(15,2)`), `empresaId`, `sincronizadoEm`.
  - Chave única: `[filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja, empresaId]` (a chave natural da SE2 inclui tipo e fornecedor).
  - Índices: `[empresaId, dataEmissao]`, `[empresaId, vencimento]`.
- `prisma/migrations/20261015120000_add_conta_pagar/migration.sql`: tabela, índices, FKs e RLS `empresa_isolation` (mesmo molde de `add_item_venda`).

**Integração**
- `rest-paths.ts`: `CONTAS_PAGAR_FALLBACK_PATHS` com `E2_FILIAL,E2_PREFIXO,E2_NUM,E2_PARCELA,E2_TIPO,E2_FORNECE,E2_LOJA,E2_NOMFOR,E2_EMISSAO,E2_VENCTO,E2_VALOR`.
- `rest-contas-pagar-fetcher.ts` (novo), `protheus-client.ts` (`fetchContasPagar?` opcional), `protheus-rest-client.ts`, `protheus-soap-client.ts` (stub vazio, como `fetchItensVenda`).
- `canonical.ts`: `CanonicalPayable` e inclusão no `IngestPayload`.
- `adapter-contas-pagar.ts` (novo): SE2 para `CanonicalPayable`.
- `sync-contas-pagar.ts` (novo): upsert idempotente com `logSync*`, sem resolver fornecedor.
- `sync-engine.ts`, `sync-jobs-config.ts`, `sync-jobs.ts` (`ENTITY_ORDER` e união de `entidade`): incluir `ContaPagar`.
- `sync-parsers.ts`: detecção e parse do CSV da SE2.
- `mocks/protheus/SE2.csv`.

**Domínio, API e UI**
- `metrics-prazo-medio.ts`: reutiliza `calcularPrazoConcedido`.
- `prazo-medio-query.ts`: `carregarTitulosPagar`. Handler e DTO ganham o bloco `pmp`.
- UI: `PrazoCardsKpi` ganha o card PMP concedido; `PrazoTabelaFornecedores.tsx` (novo, < 100 linhas).

### 3.3. Fase 3 (PMP realizado, saldos e faixas a vencer)

**3a. PMP realizado (aprovado)**
- `prisma/schema.prisma`: model `BaixaPagar` (`filial`, `prefixo`, `numero`, `parcela`, `tipo`, `sequencia`, `valorBaixa`, `dataBaixa`, `contaPagarId` FK, `empresaId`) com chave única `[contaPagarId, sequencia, dataBaixa]` e migration com RLS. Não reutilizar `Baixa`, que tem FK para `ContaReceber`.
- `adapter-baixas-pagar.ts` (novo): mantém só linhas `E5_RECPAG = 'P'` e converte para `CanonicalPayment`.
- `sync-baixas-pagar.ts` (novo): casa a baixa com `ContaPagar` por filial, prefixo, número, parcela, tipo e fornecedor; baixa sem título correspondente é registrada em `SyncLog`, como nas baixas a receber.
- `sync-jobs-config.ts` e `sync-jobs.ts`: entidade `BaixaPagar` depois de `ContaPagar` em `ENTITY_ORDER`. O fetch reaproveita `fetchBaixas` e separa `R` e `P` pelo adapter (duas passadas na SE5 no v1; cache por execução fica como melhoria).
- `rest-paths.ts` e `.env`: campos do fornecedor da SE5 (`E5_CLIFOR`, `E5_LOJA`).
- `metrics-prazo-medio.ts`: `calcularPrazoRealizado` e `calcularAtraso` reutilizados para pagar. API e UI: card "PMP realizado" e "atraso no pagamento".

**3b. Saldos e faixas (gate de aprovação próprio)**
- Migration adicionando `saldo` em `ContaReceber` e `ContaPagar` (campos `E1_SALDO` e `E2_SALDO`; no sync atual o update só toca `valor` e `vencimento`, então o `saldo` entra no update).
- Faixas a vencer (vencido, 0 a 30, 31 a 60, 61 a 90, mais de 90 dias) para receber e pagar, com `metrics-vencimentos.ts` puro, endpoint e card/gráfico.

---

## 4. Fases de Execução

### Fase 0: linha base [CONCLUÍDA]
- `pnpm test` e `pnpm typecheck` validados como linha base.

### Fase 1: PMR [CONCLUÍDA]
1. Correção do filtro da SE5 e mock (3.1).
2. `metrics-prazo-medio.ts` + testes.
3. Query, handler, rota + testes.
4. Hook, componentes, aba + testes.
5. Migration `20261015100000_add_baixa_sequencia` aplicada no banco.
- **Critério de aceite atendido**: cálculos ponderados com testes unitários, isolamento por filial e tipos SE5/SE1 filtrados.

### Fase 2: SE2 e PMP [CONCLUÍDA]
1. Schema + migration `20261015120000_add_conta_pagar` com RLS aplicada no banco.
2. Canonical, adapter, mock, sync + testes.
3. Fetcher REST/SOAP, jobs, parser CSV + testes.
4. Query/handler/UI do PMP + testes.
- **Critério de aceite atendido**: sync idempotente, isolamento por empresa, PMP Concedido apurado por fornecedor e evolução mensal.

### Fase 3: PMP realizado, saldos e faixas (ver 3.3) [CONCLUÍDA]
1. **3a [CONCLUÍDA]**: model `BaixaPagar` + migration aplicada no banco com RLS, adapter `filterBaixasPagar`/`csvRowToCanonicalBaixaPagar`, sync idempotente `syncBaixasPagar`, job `BaixaPagar`, mock `P` em `SE5.csv` + testes unitários e de integração.
2. **3a [CONCLUÍDA]**: métricas, API e UI do PMP realizado (cards de KPI, colunas de PMP Realizado e atraso por fornecedor, evolução mensal de 4 séries) + testes.
3. **3b [CONCLUÍDA]**: coluna `saldo` em `ContaReceber` e `ContaPagar`, migration `20261015160000_add_saldo_titulos` aplicada com RLS, cálculo puro em `metrics-vencimentos.ts` (vencido, 0-30, 31-60, 61-90, >90 dias), API com agings de contas a receber e pagar, UI responsiva com `PrazoFaixasVencimento` e testes unitários/componentes integrados.
- **Critério de aceite 3 atendido**: baixas `P` direcionadas à `BaixaPagar`, baixas `R` à `Baixa`, PMP Realizado e Atraso Médio calculados com exatidão e refletidos nos KPIs, gráficos e tabelas. Saldos abertos classificados em faixas canônicas com barras de progresso proporcionais para Contas a Receber e Contas a Pagar.

---

## 5. Testes (gerados, sem executar)

| Camada | Arquivo | Cobertura |
|---|---|---|
| Domínio | `utils/__tests__/metrics-prazo-medio.test.ts` | ponderação, denominador zero, atraso negativo, `diasEntre` |
| Adapter | `integration/__tests__/adapter-baixas-filter.test.ts`, `adapter-contas-pagar.test.ts`, `adapter-baixas-pagar.test.ts` | `R`/`P`/ausente; campos SE2 |
| Sync | `integration/__tests__/sync-contas-pagar.test.ts`, `sync-baixas.test.ts` (ampliar), `sync-baixas-pagar.test.ts` | insert, update, idempotência, erro isolado, duas baixas parciais do mesmo título |
| Fetch | `integration/__tests__/protheus-rest-client.test.ts` (ampliar) | chave de deduplicação de baixas sem colapsar parciais |
| API | `api/prazo-medio/__tests__/route.test.ts` | 401, filtros, tipo elegível, empresas permitidas |
| UI | `components/prazo-medio/__tests__/*.test.tsx` | cards, estado vazio ("sem dados"), tabela |

Mocks seguem os tipos reais (sem `any`).

---

## 6. Riscos e Pontos em Aberto

1. **Volume**: a query carrega linhas e agrega em JS, como a margem. Se o volume de SE1/SE2 crescer, migrar para agregação SQL (`groupBy` ou `$queryRaw` com RLS).
2. **Tipos de título**: validar com dados reais antes de produção.
   - Receber (já sincronizado), no banco do app: `SELECT tipo, COUNT(*) AS qtd, SUM(valor) AS total FROM "ContaReceber" GROUP BY tipo ORDER BY total DESC;`
   - Baixas, no banco do app: `SELECT tipo, COUNT(*), SUM("valorBaixa") FROM "Baixa" GROUP BY tipo;`
   - Pagar (ainda não sincronizado): consulta de leitura (`SELECT`) executada manualmente por você no banco do Protheus, fora do app; o sistema não acessa o banco do Protheus nem escreve nele. O sufixo da tabela varia por empresa (exemplo `010`): `SELECT E2_TIPO, COUNT(*), SUM(E2_VALOR) FROM SE2010 WHERE D_E_L_E_T_ = ' ' GROUP BY E2_TIPO;` (idem `SE1010` com `E1_TIPO`).
   - Cadastro de tipos: tabela do SX5 consultada pelo campo `E1_TIPO`/`E2_TIPO`, via Configurador.
   - Resultado esperado: cada tipo classificado como "entra" ou "sai" antes de a Fase 1 ir para produção.
3. **SE5 misturada**: confirmar em ambiente real se o endpoint já retorna baixas de pagamento (efeito colateral no `no-conta` do sync atual).
   - Validar também os nomes de campo da SE5 no ambiente do cliente: o projeto usa `E5_NUM` e `E5_BAIXA`, e pelo que sei a SE5 padrão usa `E5_NUMERO` e `E5_DATA`/`E5_DTDISPO`. Se o path atual já funciona em produção, está validado; se só funciona com mock, precisa de ajuste.
   - A SE5 também guarda juros, multas, descontos e estornos; avaliar filtro por `E5_TIPODOC` e `E5_SITUACA` para só contar baixas efetivas.
   - A deduplicação de `fetchContasReceber` também não considera `E1_FILIAL`; em ambiente com várias filiais, títulos de mesmo prefixo e número podem colapsar.
4. **Filtro de período**: PMR concedido filtra por `dataEmissao`; PMR realizado filtra por `dataBaixa`. Rotular isso na UI para o CFO não comparar os dois como se fossem a mesma janela.
5. **Chave de ContaReceber sem `tipo`**: já existe no sistema e não é alterada neste plano.

---

## 7. Entrega

- Por fase: `.zip` somente com os arquivos alterados ou novos.
- Testes gerados, sem rodar; comando para executar no VS Code: `pnpm test`, `pnpm typecheck`, `pnpm lint`.
- Comando para remover arquivos, quando houver.
- Migration com prefixo numérico padrão; nenhum arquivo `BUILD_APPROVAL_*.md` e nenhum `npm`.
