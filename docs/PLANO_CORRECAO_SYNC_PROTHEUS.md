# Plano de correção — sincronização Protheus (bkpProt)

15/10/2026

Nenhum dado real chega ao banco porque a gravação de cada entidade roda numa transação do Prisma que expira em 5 s; o plano corrige isso primeiro e depois trata volume, campos e balancete.

## Resumo e evidências

| Entidade | O que o SyncLog mostrou | Status da causa |
| --- | --- | --- |
| Cliente (SA1), Faturamento (SF2), ContaPagar (SE2), ItemVenda (SD2) | `Transaction already closed... 5000 ms` ou `Transaction not found` | Confirmada: transação interativa expira e faz rollback de tudo |
| ContaReceber (SE1) | `0 reg` | Hipótese: Protheus devolve vazio (empresa/filial, permissão ou base sem dados) |
| Baixa e BaixaPagar (SE5) | `0 reg` | Hipótese: mesma de SE1 |
| SaldoContabil (CQ0) | HTTP 500 em `genericQuery` | Confirmada: campos `CQ_*` não existem; tabela a validar (CQ0 ou CT7) |

Contagem no banco após o pull: `cli=126, fat=0, sd2=0, se1=0, cq0=0`. Os 126 clientes provavelmente vêm da rotina que grava filiais como clientes, não da SA1.

Defeitos latentes que só aparecem quando os dados chegarem: saldo de título igual ao valor (E1_SALDO e E2_SALDO não são pedidos), chaves de dedupe sem filial e sem tipo, paginação sem guarda contra loop, `filialMap` fixo em `"01"` e RLS aplicado de forma inconsistente.

## Premissas e restrições

O plano cabe na Vercel Hobby e segue o `AGENTS.md` do projeto.

- **Vercel Hobby com Fluid Compute ligado.** Os pulls recentes duraram cerca de 40 s e terminaram, então o limite não é 10 s. Mesmo assim, declarar `export const maxDuration` em cada rota e nunca depender do padrão.
- **Região das funções.** São Paulo (gru1), a mesma região do Neon (`sa-east-1`). Redeploy já feito. Se a transação ainda estourar com a região correta, o volume é grande e o lote é obrigatório, não só desejável.
- **Neon pooler.** A `DATABASE_URL` usa `-pooler`; evitar transações longas e manter lotes pequenos.
- **Regras do `AGENTS.md`.** Usar `pnpm`; arquivos e componentes com menos de 100 linhas (módulos até 200); sem `any`; logs estruturados pelo `logger`; funções assíncronas com `try/catch`; linha de base de testes antes de refatorar; migrations com nome numérico.
- **Somente leitura no Protheus.** Nenhuma fase envia dados de volta ao ERP.

## Fase 0 — Linha de base, hotfix e diagnósticos (meio dia)

O objetivo é ter testes verdes, algum dado entrando já hoje e as respostas do Protheus que decidem as fases seguintes.

1. **Linha de base.** Rodar `pnpm test`, `pnpm typecheck` e `pnpm lint`; registrar o resultado (número de testes e falhas existentes) antes de qualquer alteração.
2. **Backup do banco.** Criar um branch do Neon (snapshot) antes de migrations; o build da Vercel roda `prisma migrate deploy` sozinho.
3. **Hotfix de uma linha.** Em `_internals/sync-transaction.ts`, passar `{ maxWait: 10000, timeout: 55000 }` ao `prisma.$transaction`. Não resolve o desenho, mas deve deixar entrar Cliente, SF2, SE2 e SD2 enquanto as fases 1 e 2 não chegam. Se ainda expirar, pular direto para a fase 1.
4. **`maxDuration` explícito.** Em `app/api/protheus/pull/route.ts`, `export const maxDuration = 60`.
5. **Testes diretos no Protheus (Postman, mesmo token).** Anotar status, tempo e número de itens de cada um:
   - `genericQuery?tables=SE1&fields=E1_FILIAL,E1_NUM,E1_SALDO&pageSize=5` e o mesmo para SE5 e SE2;
   - o mesmo SE1 com o header `tenantId: 001,00101001` (formato empresa,filial);
   - `genericQuery?tables=SF2&fields=F2_DOC,F2_EMISSAO&pageSize=5&where=F2_EMISSAO >= '20250101'` para confirmar que o parâmetro `where` existe;
   - `genericQuery?tables=CT7&pageSize=1` e `tables=CQ0&pageSize=1` sem `fields`, para ler os nomes reais dos campos.
6. **Decisão.** Se SE1 e SE5 vierem vazias mesmo com `tenantId`, o problema é de dados ou permissão no Protheus, e o PMR/recebimento fica fora do escopo do código.

**Aceite:** baseline registrada; após o hotfix, `select count(*) from "Faturamento"` maior que zero; tabela de respostas do Postman preenchida.

## Fase 1 — Sync em lote, sem transação interativa (1 a 2 dias)

Troca "uma ou duas queries por linha dentro de uma transação de 5 s" por "poucas queries por lote", o que resolve a causa raiz independentemente da região.

**Desenho**

- Novo módulo `_internals/batch-upsert.ts` com funções puras e genéricas: dividir em chunks de 500, montar mapa de existentes e separar `paraCriar` de `paraAtualizar` (apenas quando algum campo mudou).
- Criação: `createMany({ data, skipDuplicates: true })` por chunk.
- Atualização: `prisma.$transaction([update, update, ...])` na forma de array, em chunks de 100, só para linhas alteradas. A forma de array não tem o limite interativo de 5 s.
- Resolução de cliente: carregar o mapa `codigo|loja → id` uma única vez por execução (`findMany` do `empresaId`) e reutilizar em Faturamento, ContaReceber e ItemVenda, em vez de um `findUnique` por linha.
- Existentes: um `findMany` por entidade, filtrado por `empresaId` (e pela janela de datas da fase 3), em vez de um `findUnique` por linha.
- `runSyncInTransaction` deixa de abrir transação; passa a rodar a função e gravar o `SyncLog` depois, em chamada separada. Cada upsert é idempotente, então não precisa de atomicidade por entidade.
- O resultado devolve contadores reais (`criados`, `atualizados`, `ignorados`, `erros`) e, para cada erro, a causa (cliente não encontrado, dado inválido).

**Arquivos tocados**

| Arquivo | Mudança |
| --- | --- |
| `_internals/batch-upsert.ts` (novo) | chunking, diff, helpers |
| `_internals/sync-clientes.ts`, `sync-faturamento.ts`, `sync-contas-receber.ts`, `sync-contas-pagar.ts`, `sync-baixas.ts`, `sync-baixas-pagar.ts`, `sync-itens-venda.ts`, `sync-saldos-contabeis.ts` | reescritos em lote, cada um abaixo de 200 linhas |
| `_internals/sync-transaction.ts` | sem `$transaction` interativa; `SyncLog` após a sincronização |
| `__tests__/` | testes por entidade: criação, atualização, repetição idempotente, cliente ausente, lote maior que o chunk |

**Aceite:** 5.000 linhas sintéticas de SD2 gravam em menos de 15 s contra o Neon; segunda execução com os mesmos dados dá zero criados e zero atualizados; testes novos e existentes verdes.

## Fase 2 — Uma entidade por chamada e paginação retomável (1 a 2 dias)

Cada requisição faz uma quantidade pequena e previsível de trabalho, e a tela conduz a sequência; assim nenhum limite de tempo derruba o pull inteiro.

**2a. Uma entidade por chamada**

- `POST /api/protheus/pull?entidade=Cliente` aceita um valor de `ENTITY_ORDER`; valor inválido retorna 400. Sem o parâmetro, mantém o comportamento atual para não quebrar testes e uso antigo.
- `pullAndSyncFromProtheus(empresaId, entidade?)` executa só o job pedido.
- `puxarDoProtheus` (`hooks/upload-panel-actions.ts`) percorre as entidades em ordem (Cliente, Faturamento, ContaReceber, ContaPagar, Baixa, BaixaPagar, ItemVenda, SaldoContabil), mostra o progresso e acumula os resultados. Falha de uma entidade não interrompe as outras, exceto que Faturamento, ContaReceber e ItemVenda só rodam se Cliente teve sucesso.
- A tela de resultado (`UploadProtheusPullSection`) passa a listar contadores por entidade e o texto de erro; o botão recarrega o dashboard no fim mesmo com falha parcial (hoje só recarrega se tudo deu certo).

**2b. Paginação retomável dentro da entidade**

- Os métodos `fetchX` do `ProtheusClient` ganham uma variação `fetchXPagina({ pagina, paginasMax, where })` que devolve `{ rows, proximaPagina | null }`.
- A rota processa até `paginasMax` páginas (padrão 4, com `pageSize` 500) ou 45 s, o que vier primeiro, e responde `{ ..., proximaPagina }`.
- A UI repete a chamada com `pagina=proximaPagina` até vir `null`, somando os contadores.
- Ao mudar o contrato do cliente, atualizar o `ProtheusRestClient`, o SOAP (que pode devolver tudo de uma vez) e os mocks dos testes.

**Aceite:** pull completo pela tela com SF2 e SD2 grandes termina sem erro de tempo; cada chamada individual responde em menos de 60 s; interromper no meio e repetir não duplica dados.

## Fase 3 — Filtro de data, paginação segura, timeout e retry (1 dia)

Reduz o volume buscado e impede que uma resposta inesperada do Protheus prenda a função em loop.

1. **Filtro de data.** Nova variável `PROTHEUS_SYNC_MESES` (padrão 12). Os paths de SF2, SD2, SE1, SE2 e SE5 passam a receber `where` com a data de emissão (`F2_EMISSAO`, `D2_EMISSAO`, `E1_EMISSAO`, `E2_EMISSAO`) ou de baixa (`E5_DATA`) maior ou igual ao início da janela. Para o aging, títulos em aberto não podem sumir: SE1 e SE2 usam `E1_SALDO > 0 OR E1_EMISSAO >= janela` (e equivalente em SE2). Depende de o teste do parâmetro `where` na fase 0 funcionar; se não funcionar, filtrar no cliente logo após cada página e parar quando a ordenação permitir.
2. **Uma só `fetchAllPages`.** Remover a versão de `rest-fetch.ts` e usar a de `rest-paginate.ts` com três guardas: página vazia encerra; limite de páginas (por exemplo 200); se a primeira linha da página N for igual à da página N-1, encerra e registra aviso (Protheus ignorando `page`).
3. **Parâmetros de página.** Não acrescentar `pagesize` se o path já tem `pageSize`; usar sempre `page` e `pageSize` com essa grafia.
4. **Timeout e retry.** Subir `PROTHEUS_FETCH_TIMEOUT_MS` de 8 s para 25 s (configurável) e usar o `exponentialBackoffWithJitter` que já existe para tentar de novo, no máximo duas vezes, em timeout e 5xx. 4xx não repete.
5. **Mensagens de erro claras.** `fetchRowsFromFirstPath` hoje devolve `[]` quando a primeira rota responde 200 vazio e só cai para a próxima em 404; manter esse comportamento, mas registrar no log qual path respondeu e quantas linhas vieram.

**Aceite:** teste unitário com resposta simulada que repete a mesma página com `hasNext: true` termina; pull de 12 meses de SF2 e SD2 busca menos linhas que o histórico completo; sem `pagesize` duplicado nas URLs registradas.

## Fase 4 — Campos, dedupe e chaves únicas (1 a 2 dias)

Garante que, quando os dados chegarem, saldos, títulos e notas estejam corretos e não se sobreponham.

**Campos a pedir nos paths (`.env`, `rest-paths.ts`, `.env.example`)**

| Tabela | Acrescentar | Para quê |
| --- | --- | --- |
| SE1 | `E1_SALDO`, `E1_BAIXA` | Aging correto; hoje o saldo assume o valor total |
| SE2 | `E2_SALDO`, `E2_BAIXA` | Idem para contas a pagar |
| SE5 | `E5_LOJA`, `E5_TIPODOC`, `E5_SITUACA`, `E5_MOTBX` | Loja do fornecedor; separar baixa real de juros, multa e estorno |
| SF2 | `F2_SERIE` já vem; passar a usar na chave | Notas com mesmo número e séries diferentes |

Os valores válidos de `E5_TIPODOC` e `E5_SITUACA` devem ser confirmados com o consultor Protheus antes de filtrar.

**Dedupe e chaves**

1. Unificar as duas `mergeAndDedupe` (em `rest-entity-fetchers.ts` e `rest-paginate.ts`) em uma só.
2. Incluir a filial nas chaves: SF2 (`F2_FILIAL`), SE1 (`E1_FILIAL`, `E1_TIPO`), SD2 (`D2_FILIAL`), SE2 (`E2_FILIAL`).
3. Migration `prisma/migrations/<numero>_chave_tipo_serie`: `ContaReceber` passa a ter unicidade em `[filial, prefixo, numero, parcela, tipo, empresaId]`; `Faturamento` ganha coluna `serie` (padrão vazio) e unicidade em `[filial, numeroNota, serie, empresaId]`. Títulos de imposto (`IR-`, `PI-`) deixam de colidir com a duplicata.
4. Atualizar `externalId`, `parseContaReceberExternalId`, `parseFaturamentoExternalId`, a busca do título em `sync-baixas.ts` e os testes.
5. Dados já gravados: como o banco está praticamente vazio (`fat=0`, `se1=0`), não há migração de dados; fazer a migration **antes** do primeiro pull completo.

**Aceite:** título parcialmente pago mostra saldo menor que o valor; dois títulos com mesmo número e tipos diferentes coexistem; testes de adapter e de sync cobrem os dois casos.

## Fases 5 e 6 — Balancete, e SE1/SE5 vazias (dependem de confirmação)

As duas dependem de respostas do Protheus; o código só muda depois delas.

**Fase 5 — Balancete**

1. Confirmar com o consultor (SX3) a tabela e os campos de saldo contábil. A CQ0 usa o prefixo `CQ0_` e não guarda saldo anterior nem atual; a CT7 (saldos mensais por conta) costuma ser a base do balancete de verificação, com campos como `CT7_DEBITO`, `CT7_CREDIT`, `CT7_ANTDEB`, `CT7_ANTCRD`, `CT7_ATUDEB`, `CT7_ATUCRD`, `CT7_MOEDA` e `CT7_TPSALD`. Isto é hipótese até a SX3 confirmar.
2. Se for a CT7: filtrar moeda `01` e tipo de saldo `1` (realizado) para não colidir na chave `[filial, conta, competencia, empresaId]`; `saldoAnterior = ANTDEB - ANTCRD`, `saldoAtual = ATUDEB - ATUCRD`; competência derivada de `CT7_DATA`.
3. Atualizar `csvRowToCanonicalSaldoContabil`, `SALDOS_CONTABEIS_FALLBACK_PATHS`, o `.env`, os mocks e os testes; o dedupe do fetcher deixa de usar `CQ_MES` e `CQ_ANO`.
4. Opcional: buscar `CT1` (`CT1_CONTA`, `CT1_DESC01`) para exibir o nome da conta; hoje a tela mostra só o código.
5. Ajustar o texto da tela ("extraídos do ERP (CQ0)") para a tabela escolhida.

**Fase 6 — SE1 e SE5 voltando vazias**

1. Se o Postman da fase 0 mostrar dados só com o header `tenantId`: criar `PROTHEUS_TENANT_ID` (formato `001,00101001`), enviado pelo `executeFetch` em toda chamada de `genericQuery`, com teste unitário do header.
2. Se mostrar dados por filial: o pull passa a iterar as filiais liberadas ao usuário (as 81 já listadas), uma chamada por filial e entidade, usando a paginação retomável da fase 2.
3. Se continuar vazio: abrir chamado com o consultor sobre permissão do usuário `admin` nessas tabelas ou sobre a base ser de desenvolvimento; sem dados na origem, PMR e aging permanecem em branco.

**Aceite:** balancete de 2026 lista contas com débito, crédito e saldos coerentes com um balancete impresso do Protheus para a mesma filial e mês; SE1 e SE5 com explicação documentada (dados chegaram ou causa registrada).

## Fase 7 — Correções menores (1 dia)

| # | Problema | Correção | Arquivos |
| --- | --- | --- | --- |
| 1 | `filialMap` mapeia toda empresa para `"01"`; filtrar filiais zera o faturamento | Coluna `filialProtheus` em `Empresa`, preenchida em `vincular-filiais.ts`; o mapa passa a usar esse código (por exemplo `00101001`) | `schema.prisma`, `vincular-filiais.ts`, `dashboard-query.ts`, `metrics-filter.ts` |
| 2 | Filiais gravadas como "clientes" (126 linhas) poluem o resolvedor de clientes e o filtro | Parar de criar `Cliente` a partir de filiais; filtro de clientes do dashboard usa só a SA1; limpar as linhas antigas depois da sua aprovação | `sync-protheus-clientes.ts`, `page.tsx` |
| 3 | Todo erro vira `protheus_unreachable` | Categorias `protheus_http`, `protheus_timeout`, `db_error`, `invalid_data`; mensagem curta na UI | `sync-transaction.ts`, `sync-executor.ts` |
| 4 | RLS: dashboard e saldos usam `withEmpresaRLS`; margem, PMR e sync não | Padronizar: usar `withEmpresaRLS` nas leituras de margem e prazo médio e `set_config` no início de cada lote de gravação | `margem-query.ts`, `prazo-medio-query.ts`, `prazo-pagar-query.ts`, `batch-upsert.ts` |
| 5 | Margem sem filtro de CFOP | Definir `PROTHEUS_CFOPS_VENDA` (o plano previa 5101, 5102, 6101, 6102) e `PROTHEUS_REST_ITENS_VENDA_PATH` no `.env` e no `.env.example` | `.env.example`, Vercel |
| 6 | Token real do Protheus dentro do `.env` do projeto | Rotacionar o token e a senha; garantir que `.env` nunca vai para git nem para zip; usar variáveis da Vercel | `.gitignore`, painel Vercel |
| 7 | Aba Margem e aba Prazo Médio ignoram os filtros globais de empresa e data | Passar `empresaIds`, `dataInicio` e `dataFim` do `useFilters` para `useMargem` e `usePrazoMedio` | `useMargem.ts`, hook do prazo médio |

**Aceite:** selecionar uma filial no filtro mostra o faturamento dela; nenhuma linha de filial aparece como cliente; mensagens de erro distinguem Protheus, banco e dados inválidos.

## Ordem, riscos e critérios de aceite

A ordem segue o que desbloqueia dados primeiro e o que depende de respostas externas por último; o total estimado é de 6 a 8 dias de trabalho.

| Ordem | Fase | Depende de | Estimativa | Entrega visível |
| --- | --- | --- | --- | --- |
| 1 | 0. Baseline, hotfix, diagnósticos | nada | meio dia | Faturamento e SD2 começam a gravar; respostas do Protheus em mãos |
| 2 | 1. Sync em lote | fase 0 | 1 a 2 dias | Pull grava milhares de linhas sem erro de transação |
| 3 | 4. Campos, dedupe, chaves | fase 0 | 1 a 2 dias | Saldos e títulos corretos (fazer **antes** do primeiro pull completo) |
| 4 | 3. Data, paginação, retry | fase 1 | 1 dia | Pull menor e sem risco de loop |
| 5 | 2. Uma entidade por chamada | fases 1 e 3 | 1 a 2 dias | Progresso por entidade na tela |
| 6 | 5. Balancete | SX3 do consultor | 1 dia | Aba Balancete com dados |
| 7 | 6. SE1 e SE5 | Postman da fase 0 | 0,5 a 2 dias | PMR e aging com dados, ou causa documentada |
| 8 | 7. Correções menores | fase 1 | 1 dia | Filtros por filial e mensagens de erro claras |

**Riscos e respostas**

- **Migration destrutiva no deploy.** O `build` executa `prisma migrate deploy`; criar o branch do Neon antes e aplicar a migration da fase 4 em um deploy separado.
- **O parâmetro `where` do `genericQuery` não existir.** Plano B da fase 3: filtrar no cliente e parar pela ordenação.
- **Mudar o contrato de `ProtheusClient` quebra testes e o SOAP.** Fazer a fase 2b depois de a 2a estar verde, mantendo os métodos antigos até trocar todos os usos.
- **Volume maior que o previsto.** Se 12 meses ainda forem muitos, reduzir `PROTHEUS_SYNC_MESES` e importar o histórico por janelas mensais em chamadas separadas.
- **Limites do plano free.** Se algum pull passar de 60 s, a paginação retomável da fase 2b absorve; se o Neon free pausar por inatividade, a primeira chamada pode demorar, então o cliente deve tentar de novo uma vez.

**Rollback:** cada fase vai em commit próprio; a fase 4 em deploy isolado, com restauração pelo branch do Neon se algo falhar.

**Critério final:** depois de um pull completo pela tela, `Faturamento`, `ItemVenda`, `ContaPagar` e `Cliente` têm linhas; a aba Margem mostra receita e custo; Balancete lista saldos de 2026; PMR mostra valores ou a causa de SE1/SE5 está documentada; segunda execução do pull não duplica nada; `pnpm test`, `pnpm typecheck` e `pnpm lint` verdes.
