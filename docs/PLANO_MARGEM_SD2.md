# Plano de Implementação: Apuração de Margem e Lucro (Tabela SD2 + SA1)

> Alinhado e aprovado em 14/10/2026.
> Em conformidade com AGENTS.md e GEMINI.md.

---

## 1. Diretrizes e Premissas Aprovadas
1. **Margem na v1**: **Margem Bruta** (Receita - Custo), calculada como `D2_TOTAL - D2_CUSTO1`. A margem líquida (dedução de impostos ICMS, PIS, COFINS) fica para a Fase 4.
2. **Elegibilidade de Venda**: Filtro padrão `D2_TIPO = 'N'` (vendas normais) com lista de CFOPs de venda configurável via variável de ambiente (`PROTHEUS_CFOPS_VENDA`, com fallback para operações comuns de venda como `5101,5102,6101,6102`).
3. **Itens sem Custo**: Itens com `D2_CUSTO1 = 0` (serviços ou itens sem movimentação de estoque) são excluídos do cálculo da Margem % para não distorcer o resultado em 100%. Exibição da métrica de Cobertura de Custo (Receita com custo apurado / Receita total * 100).
4. **Interface**: Aba dedicada "Margem" no Dashboard, mantendo todos os componentes com menos de 100 linhas.

---

## 2. Arquitetura da Solução

```
[TOTVS Protheus (SD2)] / [SD2.csv]
       │
       ▼
[ProtheusClient (REST)] ──> genericQuery (SD2) com paginação e filtro D2_EMISSAO
       │
       ▼
[Adapter (CanonicalSaleItem)] ──> Normalização de tipos e campos canônicos
       │
       ▼
[Sync Engine (sync-itens-venda)] ──> Resolução de Cliente (D2_CLIENTE+D2_LOJA -> SA1) + Upsert
       │
       ▼
[PostgreSQL (ItemVenda)] ──> RLS multi-tenant (empresa_isolation) + Índices
       │
       ▼
[Backend: /api/margem] ──> Agregação SQL (groupBy / SUM) via _internals/margem-query.ts
       │
       ▼
[Domínio Puro: metrics-margem.ts] ──> Cálculo de Margem R$, Margem %, Cobertura %
       │
       ▼
[Frontend: useMargem hook] ──> Hook de estado e API desacoplado
       │
       ▼
[UI: src/components/margem/] ──> Cards KPI + Gráficos + Tabela por Cliente (< 100 linhas)
```

---

## 3. Estrutura de Arquivos

### 3.1. Banco & Modelagem
- `prisma/schema.prisma`: Adição do model `ItemVenda` com chave única `[filial, numeroNota, serie, clienteId, item, empresaId]`.
- `prisma/migrations/20261014033000_add_item_venda/migration.sql`: Migration numérica com RLS `empresa_isolation`.

### 3.2. Integração & Sync
- `src/lib/integration/canonical.ts`: Extensão de `EntidadeCanonica` e definição de `CanonicalSaleItem`.
- `src/lib/integration/_internals/adapter-itens-venda.ts`: Conversor puro Protheus SD2 -> `CanonicalSaleItem`.
- `src/lib/integration/_internals/rest-paths.ts`: Rota para itens de venda SD2.
- `src/lib/integration/_internals/rest-entity-fetchers.ts`: Método `fetchItensVenda()`.
- `src/lib/integration/_internals/sync-itens-venda.ts`: Lógica de sincronização com resolução de cliente SA1 e upsert idempotente.
- `src/lib/integration/_internals/sync-jobs-config.ts` e `sync-jobs.ts`: Inclusão no pipeline de sincronização.
- `src/lib/integration/_internals/sync-parsers.ts`: Detecção e parse de CSV da SD2.
- `mocks/protheus/SD2.csv`: Dados de exemplo para testes locais.

### 3.3. Domínio Puro de Métricas
- `src/lib/utils/metrics-margem.ts`: Funções puras para apuração de Margem Bruta R$, Margem Bruta % e Cobertura de Custo %.

### 3.4. Backend / API
- `src/app/api/margem/types.ts`: DTOs de request e response.
- `src/app/api/margem/_internals/margem-query.ts`: Agregação no banco via Prisma (totais, clientes, evolução temporal).
- `src/app/api/margem/route.ts`: Endpoint GET `/api/margem`.

### 3.5. Frontend
- `src/components/margem/types.ts`: DTOs e tipos de view-model da margem.
- `src/components/margem/hooks/useMargem.ts`: Hook de dados e filtros.
- `src/components/margem/margem-component.tsx`: Componente principal (< 100 linhas).
- `src/components/margem/common/MargemCardsKpi.tsx`: Cards de indicadores (< 100 linhas).
- `src/components/margem/common/MargemGraficoTemporal.tsx`: Gráfico temporal (< 100 linhas).
- `src/components/margem/common/MargemTabelaClientes.tsx`: Tabela por cliente (< 100 linhas).
- `src/components/margem/index.ts`: Barrel público.
- `src/app/dashboard/page.tsx`: Integração da aba "Margem".

---

## 4. Fases de Execução
- **Fase 0**: Linha base de testes existente (`pnpm test`).
- **Fase 1**: Modelagem Prisma, Migration RLS, Tipos canônicos, Adapter e Mock CSV.
- **Fase 2**: Engine de sincronização e fetcher.
- **Fase 3**: Domínio puro de cálculo e endpoint `/api/margem`.
- **Fase 4**: Hook e componentes de UI da aba Margem.
- **Fase 5**: Validação final de testes, TypeScript e lint.
