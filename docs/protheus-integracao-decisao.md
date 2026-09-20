# Decisão de Integração com o Protheus

## Escopo desta implementação

- **Somente consumo**: o sistema lê dados do Protheus. Não existe (nem
  está previsto) nenhum envio de volta.
- **Sem cron/scheduler**: a atualização é disparada manualmente pelo
  botão "Atualizar do Protheus" na tela de upload, que chama
  `POST /api/protheus/pull`.
- O restante do pipeline (adapter canônico + sync-engine + SyncLog) é
  **o mesmo já existente** para o fluxo de CSV — só a origem do dado
  mudou.

## Opção escolhida: REST nativo (primário) + SOAP (fallback)

| Opção | Decisão | Motivo |
|---|---|---|
| **REST API nativa** | ✅ Modo primário | JSON, mais simples de consumir a partir de Node/Next.js sem dependências pesadas, e é a direção que a TOTVS vem empurrando para integrações novas em versões recentes do Protheus. |
| **WebServices SOAP** | ✅ Fallback | Gratuito e presente até em instalações antigas, mas XML verboso e mais lento de evoluir. Mantido como opção B para quando o REST não está habilitado no ambiente do cliente. |
| **Conexão direta ao banco** | ❌ Descartado | Quebra o encapsulamento do ERP: o schema do Protheus é dirigido por metadados (SX2/SX3), fortemente customizável por cliente, e acessar direto o banco ignora regras de negócio, triggers e validações que só existem na camada de aplicação do Protheus. Também é uma prática tipicamente não suportada/não recomendada pela TOTVS. |
| **Middleware Node/Python via ODBC/JDBC** | ❌ Descartado | Adiciona mais uma peça de infraestrutura e uma camada de tradução de protocolo sem necessidade, já que o próprio Protheus expõe REST/SOAP nativamente. Além disso, acesso ODBC/JDBC ao Protheus normalmente depende de um conector adicional (ex: TOTVS DBAccess), o que é mais uma dependência de licenciamento a gerenciar sem ganho real sobre usar a API nativa. |

## Por que uma abstração (`ProtheusClient`) em vez de só REST

Como a viabilidade de REST depende de confirmação com o time responsável
pelo Protheus (nem toda instalação tem o módulo habilitado), foi criada
uma interface comum (`src/lib/integration/protheus-client.ts`) com duas
implementações:

- `ProtheusRestClient` (`protheus-rest-client.ts`)
- `ProtheusSoapClient` (`protheus-soap-client.ts`)

A escolha é feita em runtime via `PROTHEUS_INTEGRATION_MODE` (`rest` ou
`soap`), sem precisar trocar nenhum código de sincronização. Ambas
retornam os dados no mesmo formato de campos Protheus (`A1_COD`,
`F2_DOC`, etc.) que os adapters em `protheus-adapter.ts` já processavam
vindo do CSV — por isso o `sync-engine.ts` não precisou de nenhuma
alteração.

## O que ainda precisa ser confirmado com o time do Protheus (Fase 0)

Os arquivos `protheus-rest-client.ts` e `protheus-soap-client.ts` têm
placeholders marcados com `TODO` para os pontos que variam por
instalação e que não dá para adivinhar sem acesso ao ambiente real:

- **REST**: path exato de cada endpoint, formato de autenticação
  (Basic vs. OAuth2/Bearer com endpoint de token), e o "shape" exato do
  JSON de resposta (`items`, `data`, array puro, etc).
- **SOAP**: nome real da operação/namespace no WSDL publicado, e a
  estrutura exata do XML de retorno (o parser incluso assume um formato
  tabular simples; se o WSDL do cliente for diferente, o parser precisa
  ser ajustado ou trocado por uma lib como `fast-xml-parser`).

Sem essas informações não é possível apontar para um Protheus real —
mas toda a estrutura (endpoint, botão, orquestração, SyncLog) já está
pronta para receber esses ajustes.

## Arquivos adicionados/alterados

- `src/lib/integration/protheus-client.ts` — contrato comum
- `src/lib/integration/protheus-rest-client.ts` — implementação REST
- `src/lib/integration/protheus-soap-client.ts` — implementação SOAP
- `src/lib/integration/protheus-client-factory.ts` — escolha via env
- `src/lib/integration/pull-and-sync.ts` — orquestração (fetch → adapter → sync-engine → SyncLog)
- `src/app/api/protheus/pull/route.ts` — endpoint chamado pelo botão
- `src/app/upload/page.tsx` — botão "Atualizar do Protheus"
- `.env.example` — novas variáveis de configuração
