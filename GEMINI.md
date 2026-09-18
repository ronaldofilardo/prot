# PREMISSAS DE PROGRAMAÇÃO — Metodologia Preventiva
> Objetivo: impedir que o agente codificador gere código que precise ser refatorado depois.
> Regra fundamental: se o arquivo exigir refatoração, ele não deve ser gerado assim.

---

## 0. Proibições Absolutas (Agente NÃO DEVE gerar)
- [ ] **NENHUM comando `npm`** (este PC não executa `npm`, usar estritamente `pnpm` ou `npx`)
- [ ] **NENHUM componente com > 100 linhas** 
- [ ] **NENHUMA lógica de API ou estado complexo dentro de componente de renderização**
- [ ] **NENHUM arquivo `BUILD_APPROVAL_*.md`, `TEST_APPROVAL_*.md`, `ALL_TESTS_APPROVED_*.md`** (aprovação vive no PR + CI)
- [ ] **NENHUMA duplicação de factory/config** 
- [ ] **NENHUM componente que misture formulário, histórico, preview e estado no mesmo arquivo**
- [ ] **NENHUM `console.log` sem contexto estruturado** (usar `logger` com prefixos)
- [ ] **NENHUM tipo `any` como solução padrão em mocks ou interfaces**
- [ ] **NENHUM arquivo de migração `sync_*`, `fix-*`, `apply_*` ou com prefixo não-numérico padrão no raiz de migrations**
- [ ] **NENHUMA função sem `try/catch` quando for assíncrona e tocar API/banco/arquivo**
- [ ] **NENHUM arquivo com complexidade ciclomática > 10 (limite máximo: 15)** — se passar de 10, dividir antes; se chegar a 15, refatorar imediatamente antes de entregar

---

## 1. Estrutura Obrigatória ao Gerar Qualquer Módulo
O agente DEVE criar a estrutura abaixo antes de escrever uma única linha de lógica:
```
modulo/
├── index.ts                     # barrel (re-export público)
├── types.ts                     # interfaces / DB-row canônico + DTO
├── [modulo]-component.tsx       # componente principal (< 100 linhas)
├── hooks/
│   └── useModulo.ts             # estado + API (testável isoladamente)
├── common/
│   ├── SubFormulario.tsx        # UI reutilizável (genérico)
│   └── SubHistorico.tsx         # UI reutilizável (genérico)
└── utils/
    └── formatModulo.ts          # funções puras (sem side effects)
```

Se o módulo envolve arquivos (upload/download/delete/health), DEVE ter:
```
modulo/
└── _internals/
    ├── [modulo]-upload.ts
    ├── [modulo]-download.ts
    ├── [modulo]-delete.ts
    ├── [modulo]-health.ts
    ├── logger.ts
    └── errors.ts
```

---

## 2. Regras de Geração por Camada

### 2.1 Componente Principal (< 100 linhas)
O agente DEVE garantir:

```tsx
// ✅ PERMITIDO
function MeuComponente() {
  const { estado, acao } = useModulo();
  return (
    <div>
      <SubFormulario />
      <SubHistorico />
    </div>
  );
}
```

```tsx
// ❌ PROIBIDO — NÃO GERAR ISSO
function MeuComponente() {
  const [dados, setDados] = useState();
  const buscar = async () => { /* 50 linhas de fetch + parse */ };
  const validar = () => { /* 30 linhas */ };
  return (/* formulário + histórico + preview tudo misturado */);
}
```

### 2.2 Hook (`useModulo`)
- Toda lógica de estado e API vai aqui.
- Deve ser testável isoladamente.
- Não pode importar componentes de UI, apenas tipos e utils.

### 2.3 Componentes Comuns (`common/`)
- Devem ser genéricos o suficiente para reuso em outros fluxos (`Upload*`, `Download*`, etc.).
- Não podem ter referência direta ao módulo pai (sem `import { useModulo }` dentro deles).

### 2.4 Utilitários (`utils/`)
- Funções puras (`formatCNPJ`, `extensaoFromMime`).
- Sem `useState`, `useEffect`, chamadas de API, acesso a `window` não encapsulado.

---

## 3. Regras de Separação DB-Row vs DTO
O agente DEVE criar dois conjuntos de tipos e nunca colidir nomes:
```ts
// DB-row canônico (1:1 com PostgreSQL)
import type { Entidade, Documento } from '@/lib/types';

// DTO de hook (view-model agregado)
import type { EntidadeDTO, DocumentoDTO } from '@/lib/hooks/useEntidades';
```

Se gerar uma API que retorna row pura → usar `Entidade` (DB-row).  
Se gerar um hook que agrega campos calculados → criar `EntidadeDTO` e usá-lo no componente.

---

## 4. Aderência Restrita aos Princípios de Arquitetura
> Toda geração de arquivo DEVE respeitar rigidamente os princípios abaixo. Se um arquivo violar qualquer um deles, ele NÃO PODE ser entregue.

### 4.1 SOLID (Obrigatório — verificar cada arquivo)
| Princípio | Regra de Geração (Agente) | Violação Típica |
| :--- | :--- | :--- |
| **S** — Single Responsibility | Cada arquivo tem **apenas uma razão para mudar** (ex: `upload.ts` só faz upload; `logger.ts` só loga) | Componente com API + renderização + validação no mesmo arquivo |
| **O** — Open/Closed | Módulos devem ser abertos para extensão, fechados para modificação (usar interfaces, barrel files) | Editar código existente para adicionar comportamento |
| **L** — Liskov Substitution | Subtipos (`SubFormulario`, `SubHistorico`) devem ser substituíveis sem quebrar o componente pai | Componentes comuns que exigem `if (tipo === 'A')` para funcionar |
| **I** — Interface Segregation | Não criar interfaces gordas; cada cliente importa apenas o que usa (`types.ts` separa DB-row e DTO) | `entidade.interface` com 50 campos quando só precisa de 5 |
| **D** — Dependency Inversion | Componentes altos dependem de abstrações (`useModulo` como interface de comportamento), não de detalhes (`fetch` direto no componente) | Componente principal chamando `fetch()` diretamente |

### 4.2 Clean Architecture (Obrigatório — verificar estrutura do módulo)

O agente DEVE organizar cada módulo em camadas claras:

```
Camada Externa (Frameworks / UI)
  ├── [modulo]-component.tsx
  ├── common/          (sub-componentes reutilizáveis)

Camada de Aplicação (Casos de Uso / Estado)
  ├── hooks/useModulo.ts
  └── types/           (DTOs, interfaces de domínio)

Camada de Domínio (Regras de Negócio Puras)
  ├── utils/formatModulo.ts
  └── _internals/*     (lógica de negócio isolada)

Camada de Infraestrutura (API, DB, Arquivos, Logs, Erros)
  ├── _internals/upload.ts
  ├── _internals/download.ts
  └── _internals/logger.ts / errors.ts
```

**Regras preventivas por camada:**
- **UI (Externa)**: só renderiza. Nenhuma chamada `fetch`, `useState` complexo, `console.log`.
- **Aplicação (Hook)**: orquestra casos de uso. Não conhece detalhes do cliente de armazenamento, mas usa abstração (`upload` via `useModulo`).
- **Domínio (Utils / Internals)**: funções puras, sem dependência de framework (`React`, `Next.js`). Se importar React, está na camada errada.
- **Infraestrutura (Internals)**: implementa detalhes (cliente de armazenamento, `logger`, `errors`). Não importa componentes UI.

**Proibido:** qualquer arquivo que misture duas camadas (ex: componente que importa `StorageClient` diretamente ou `logger.ts` que importa `useState`).

### 4.3 Design Patterns (Obrigatório — aplicar conforme contexto)
O agente DEVE reconhecer e aplicar os padrões abaixo ao gerar código. Se o contexto exigir um padrão e ele não for aplicado, o arquivo é considerado incompleto.
| Padrão | Quando Aplicar | Regra de Geração | Exemplo no Sistema |
| :--- | :--- | :--- | :--- |
| **Factory Method** | Criação de objetos complexos (clientes de armazenamento, conexões DB, formatadores) | Sempre criar `*-factory.ts` para eliminar `new` duplicado | `storage-client-factory.ts` (1 só instância) |
| **Repository** | Acesso a dados (DB, arquivos, APIs externas) | Separar acesso a dados em `_internals/` com interface clara | `storage-upload.ts`, `repository-storage.ts` (barrel) |
| **Adapter** | Conversão entre interfaces incompatíveis (DB-row → DTO, resposta API → tipo interno) | Criar função de adaptação em `utils/` ou no hook | `extensaoFromMime()` (adapta MIME → extensão) |
| **Strategy** | Comportamento intercambiável (validação de arquivo, estratégia de upload) | Separar estratégia em arquivo próprio, não `if/else` no componente | `mime-utils.ts` (estratégias de validação) |
| **Observer / Pub-Sub** | Notificações entre módulos (ex: evento de upload concluído) | Usar eventos ou callbacks definidos em `types.ts`, não props diretas | Eventos no hook (`onUploadComplete`) |
| **Dependency Injection** | Inversão de dependências (componentes altos dependem de abstrações) | Sempre injetar via props ou contexto de hook; nunca criar instância no componente | `useModulo()` retorna `{ buscarEntidade, executarEtapa }` |
| **Singleton (Restrito)** | Configuração global (env, cliente de armazenamento) | Usar apenas via factory centralizada; nunca instanciar diretamente no componente | `getStorageConfig()` (único ponto) |
| **Facade** | Interface simplificada para subsistema complexo | Criar `index.ts` (barrel) que esconde `_internals/` | `storage-client.ts` (barrel, esconde módulos internos) |

---

## 5. Regras de Qualidade Automática (Cada Arquivo Gerado)
Antes de finalizar qualquer arquivo, o agente DEVE validar:
- [ ] Arquivo tem < 100 linhas? Se não, extrair hook/componente/comum.
- [ ] Existe duplicação com outro arquivo já existente? Se sim, extrair para `utils/` ou `_internals/`.
- [ ] Todos os imports usam `@/` absoluto?
- [ ] Há `try/catch` em toda operação assíncrona?
- [ ] Há `export` de barrel (`index.ts`) preservando API pública?
- [ ] Componentes `common/` são genéricos (não acoplados ao módulo)?
- [ ] Nenhum `console.log` solto — se precisa logar, criar `logger.ts`?
- [ ] Nenhum tipo `any` sem justificativa?
- [ ] Nenhum arquivo de aprovação manual criado?

---

## 6. Regras de Testes Preventivas
O agente DEVE, ao gerar código, já prever:
- [ ] Hook pode ser testado isoladamente (sem renderizar componente)
- [ ] Componentes UI são simples o suficiente para testar apenas renderização
- [ ] Mocks correspondem aos tipos reais das funções
- [ ] Nenhum arquivo `.md` de aprovação manual é criado
- [ ] Ambiente de testes designado é respeitado (não misturar ambientes)
- [ ] Mocks são limpos (`clearAllMocks`) entre testes

---

## 7. Regras de Módulo / Storage / Arquivos
Se gerar módulo que toca arquivos (upload, backup, download):
- [ ] Criar `types.ts` com interfaces (`UploadResult`, `ArquivoRemotoInfo`)
- [ ] Criar `mime-utils.ts` com `extensaoFromMime()` e `validarMagicBytes()` (1 só lugar)
- [ ] Criar `storage-client-factory.ts` — **apenas 1 `new StorageClient` no sistema**
- [ ] Separar por verbo: `upload.ts`, `download.ts`, `delete.ts`, `health.ts`
- [ ] Arquivos públicos (`storage-client.ts`) reduzidos a barrel (< 15 linhas)
- [ ] Todo código de implementação em `_internals/`

---

## 8. Regras de Logs e Erros Preventivas
- [ ] Criar `logger.ts` com prefixos (`logStorage`, `withStorageLog`)
- [ ] Criar `errors.ts` com `wrapStorageError`, `isNotFoundError`, `isInvalidCredentialsError`
- [ ] Substituir todos `console.log` por `logStorage()` ou `withStorageLog()`
- [ ] Nunca expor mensagens internas sensíveis ao usuário final

---

## 9. Checklist de Geração (Agente Deve Marcar Antes de Entregar)
Antes de declarar o arquivo/módulo "pronto", o agente DEVE confirmar:
- [ ] Nenhum arquivo excede 100 linhas no componente principal
- [ ] Nenhuma duplicação de factory/config/formatador
- [ ] Nenhum componente que misture lógica de API + renderização
- [ ] Nenhum arquivo de aprovação manual gerado
- [ ] Nenhum `console.log` sem contexto
- [ ] Nenhuma função assíncrona sem `try/catch`
- [ ] Nenhuma duplicação de `new Client`
- [ ] Nenhum tipo `any` desnecessário
- [ ] Nenhuma migração com prefixo proibido (`fix-*`, `apply-*`, `sync_*`, `DEPRECATED_*`, `XXXX_*`)
- [ ] Nenhuma migração > 20 KB (se sim, dividir)
- [ ] **Complexidade ciclomática <= 10 (máximo 15) em todos os arquivos** — se > 10, dividir; se >= 15, não entregar sem redução
- [ ] **SOLID respeitado**: cada arquivo tem uma razão para mudar (S), usa interfaces/barrels para extensão (O), subtipos substituíveis (L), interfaces não gordas (I), componente depende de abstração (`useModulo`) não de `fetch` direto (D)
- [ ] **Clean Architecture respeitada**: nenhuma mistura de camadas (UI não importa `StorageClient`; Infra não importa React; Domínio não importa framework)
- [ ] **Design Patterns aplicados**: Factory para objetos complexos, Repository para acesso a dados, Adapter para conversão, Strategy para comportamento intercambiável, Dependency Injection via hook/propriedade, Facade (`index.ts`) para subsistema, Singleton apenas via factory centralizada

---

## 10. Exemplos de Problemas Evitados
| Problema Típico | Premissa Preventiva Neste Sistema |
| :--- | :--- |
| Componente com 617 linhas | < 100 linhas obrigatório |
| 9 fases de cascata acopladas | Hook separa estado + API |
| `new StorageClient` duplicado 8x | 1 factory (`storage-client-factory.ts`) |
| `console.log` solto | `logger.ts` com prefixos |
| Arquivos `migration-*` e `fix-*` no raiz | Proibição de prefixos não-numéricos |
| Componentes comuns não genéricos | `common/` deve ser reutilizável sem acoplamento |

---

## 11. Regra Final para o Agente
> Se você está prestes a gerar um arquivo que, ao ser lido, exigiria uma refatoração como um componente legado com 617 linhas, **pare e divida-o antes**.
> A refatoração é um sintoma de geração incorreta. Este documento existe para eliminar o sintoma na origem.

---

## Autoridade (Conceitos Base)
- Princípios SOLID (Robert C. Martin)
- Clean Architecture (Robert C. Martin / Uncle Bob)
- Design Patterns (GoF — Gang of Four)
- Métricas de complexidade ciclomática (McCabe)

