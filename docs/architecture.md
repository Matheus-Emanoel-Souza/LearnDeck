# Arquitetura — LearnDeck

## Visão geral

LearnDeck é um aplicativo **desktop, 100% local e offline**, para gerenciar estudos através de
cards em um quadro estilo Kanban (colunas dinâmicas, editáveis por workspace), com cronômetro,
Pomodoro, comentários, histórico, relacionamentos entre cards, anexos, prazos, subtarefas,
calendário e central de notificações de atraso.

Não há servidor, não há rede, não há dependência de internet. Todos os dados vivem em um
arquivo SQLite dentro da pasta de dados do usuário (`%APPDATA%\LearnDeck`).

## Stack tecnológica

| Camada | Tecnologia | Motivo |
|---|---|---|
| Runtime desktop | **Electron** | Único caminho maduro para "Node.js puro" gerar um app desktop Windows completo (janela nativa, acesso a arquivo, tray, notificações). |
| Bundler / dev server | **electron-vite** | Empacota main/preload/renderer com Vite, HMR no renderer durante o desenvolvimento, build de produção simples. |
| Linguagem | **TypeScript** | Tipagem em todas as camadas (main, preload, renderer) — essencial num app com bastante lógica de domínio (cronômetro, pomodoro, histórico). |
| UI | **React 18** | Ecossistema maduro, componentização natural para um Kanban + modais de detalhe. |
| Banco de dados | **SQLite** via `better-sqlite3` | Local, embutido, transacional, síncrono (importante: rodando dentro do processo *main* do Electron, não precisa de async/await para cada query, o que simplifica MUITO a camada de dados). Arquivo único, fácil de fazer backup manual. |
| Migrations | Script próprio, SQL puro versionado em `src/main/db/migrations/*.sql` | Sem dependência de ORM pesado; controle total do schema; fácil de auditar. |
| Empacotamento | **electron-builder** | Gera instalador `.exe` (NSIS) para Windows, mesmo padrão usado no RadarTorres (self-contained, sem exigir Node/Electron pré-instalado no PC do usuário). |
| Gerenciador de pacotes | **npm** | Já vem com o Node, zero setup adicional. |

### Por que não um ORM (Prisma/TypeORM/Drizzle)?

Considerado, mas descartado por ora:

- `better-sqlite3` é **síncrono**, o que casa perfeitamente com rodar só no processo main do
  Electron (sem HTTP, sem múltiplos clientes concorrentes) — não precisamos da camada
  assíncrona que os ORMs otimizam.
- Um app deste porte tem entidades bem conhecidas e estáveis (ver [`database.md`](./database.md));
  SQL explícito em repositórios é mais fácil de auditar e não traz uma dependência pesada extra
  no bundle do instalador.
- Se o projeto crescer muito (sincronização em nuvem, schema mais dinâmico), migrar para
  **Drizzle ORM** é o caminho natural — ele também usa `better-sqlite3` por baixo, então a
  migração seria incremental, não uma reescrita.

### Por que Electron e não Tauri?

Tauri gera binários menores e mais leves em RAM, mas exige lógica nativa em **Rust**. Você
pediu para priorizar o ecossistema Node.js — Electron mantém 100% do código (main, preload,
renderer, lógica de domínio) em TypeScript. Fica registrado como decisão em
[`decisions.md`](./decisions.md) caso o app cresça e o consumo de recursos vire um problema.

## Processos do Electron

```text
┌─────────────────────────────┐        IPC        ┌──────────────────────────────┐
│         Main process        │ <────────────────> │        Preload script         │
│  (Node.js, sem sandbox)     │   contextBridge     │  (ponte segura, sandboxed)     │
│                              │                     └──────────────────────────────┘
│  - Janela (BrowserWindow)   │                                    │
│  - Acesso ao SQLite          │                                    │  window.api.*
│  - Regras de negócio         │                                    ▼
│    (services/repositories)  │                     ┌──────────────────────────────┐
│  - Handlers IPC (ipcMain)   │                     │         Renderer process       │
└─────────────────────────────┘                     │   (React, sandboxed, sem       │
                                                      │    acesso direto a Node/FS)    │
                                                      │   - Kanban, modais, timers UI │
                                                      └──────────────────────────────┘
```

Princípios:

- **`contextIsolation: true` e `nodeIntegration: false`** no `BrowserWindow` — o renderer nunca
  toca em Node.js ou no banco diretamente. Toda comunicação passa pelo `preload` via
  `contextBridge`, expondo uma API tipada (`window.api`).
- **Toda regra de negócio vive no processo main** (services), não no renderer. O renderer é
  "burro": chama a API exposta, recebe dados prontos, renderiza.
- **Repositórios (`src/main/repositories`)** encapsulam SQL. **Serviços (`src/main/services`)**
  orquestram regras (ex.: mover um card de status também grava uma linha no histórico, dentro
  da mesma transação).
- **IPC handlers (`src/main/ipc`)** são finos: validam entrada e delegam para os services.

## Estrutura de pastas

```text
LearnDeck/
├── docs/                      # Documentação do projeto (este diretório)
│   ├── architecture.md
│   ├── database.md
│   ├── decisions.md
│   ├── features.md
│   └── roadmap.md
├── src/
│   ├── main/                  # Processo principal (Node.js)
│   │   ├── index.ts           # Bootstrap: cria janela, inicializa DB, registra IPC
│   │   ├── db/
│   │   │   ├── connection.ts  # Abre o arquivo SQLite (%APPDATA%/LearnDeck)
│   │   │   ├── migrate.ts     # Runner de migrations
│   │   │   └── migrations/    # Scripts .sql versionados (001_init.sql, 002_...)
│   │   ├── repositories/      # Acesso a dados (1 arquivo por entidade principal)
│   │   ├── services/          # Regras de negócio (StatusService, TimerService, ...)
│   │   └── ipc/                # Handlers ipcMain, 1 arquivo por domínio
│   ├── preload/
│   │   ├── index.ts           # contextBridge.exposeInMainWorld('api', ...)
│   │   └── index.d.ts         # Tipagem global de window.api para o renderer
│   ├── renderer/               # App React (Vite)
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx         # Navegação entre abas: Estudos, Dashboard, Calendário, Configurações
│   │       ├── pages/          # StudyPanel (quadro), CardDetailPage, Dashboard, CalendarPage,
│   │       │                   #   NotificationsPage, Settings
│   │       ├── components/     # KanbanBoard/Column/Card, ColumnContextMenu, NewColumnMenu,
│   │       │                   #   CardActionsMenu (⋮), CardAttachments, CardSubtasks,
│   │       │                   #   CardRelations, CardTimer, CardPomodoro, NotificationBell, ...
│   │       └── styles/
│   └── shared/                  # Tipos TS compartilhados entre main/preload/renderer
│       └── types.ts             # Card, Group, StudySession, Pomodoro, etc.
├── build/                       # Ícones e assets do instalador
├── electron.vite.config.ts
├── electron-builder.yml
├── tsconfig*.json
└── package.json
```

`src/shared/types.ts` é a fonte única de verdade para os formatos de dados (Card, Group,
Session, etc.) — usado tanto pelos repositórios no main quanto pelos componentes no renderer,
evitando duplicação e dessincronia de tipos entre os processos.

## Fluxo de dados (exemplo: iniciar uma sessão de estudo)

1. Usuário clica em "Iniciar estudo" no card, no renderer.
2. Renderer chama `window.api.timer.start(cardId)`.
3. Preload repassa via `ipcRenderer.invoke('timer:start', cardId)`.
4. Handler em `src/main/ipc/timer.ts` valida o `cardId` e chama `TimerService.start(cardId)`.
5. `TimerService` grava o início da sessão (tabela `study_sessions`, `ended_at = NULL`) via
   `SessionRepository`.
6. Resposta volta pela mesma cadeia; o renderer atualiza a UI (mostra cronômetro rodando).
7. Ao clicar em "Parar", o fluxo se repete para `timer:stop`, que fecha a sessão
   (`ended_at`, `duration_seconds`) e atualiza o tempo total do card.

## Colunas dinâmicas (Kanban)

Desde a `002_board_columns.sql` as colunas do quadro deixaram de ser um enum fixo
(`backlog`/`to_study`/.../`done`) e passaram a ser dados: `board_columns` por workspace, com
nome, posição, cor e uma flag `is_done`. `cards.status` virou `cards.column_id` (FK livre).
Criar/renomear/reordenar/colorir/duplicar/excluir uma coluna acontece pelo menu de contexto
(botão direito) no cabeçalho da coluna (`ColumnContextMenu`), sem exigir migração de schema
para cada mudança.

## Menu de ações do card (⋮)

Cada `KanbanCard` tem um botão de três pontos (`CardActionsMenu`) que abre um menu com 4
opções: **Novo apontamento**, **Enviar comunicação**, **Agrupar ticket**, **Abrir ticket
filho**. Nenhuma delas é uma funcionalidade nova — são atalhos que abrem `CardDetailPage` já
rolada/focada na seção correspondente (cronômetro, comentários ou cards relacionados),
reaproveitando o que já existe lá (ver `StudyPanel.handleCardAction`). "Abrir ticket filho"
navega direto para o card relacionado quando existe exatamente um; caso contrário, abre a
seção de relacionados para a pessoa escolher.

## Caderno do card

Aba **Caderno** na tela do card (`CardDetailPage`), ao lado de Detalhes — documentação técnica
em Markdown com editor visual, um caderno por card (1:1, `notebooks.card_id UNIQUE`, criado sob
demanda no primeiro save). Não substitui os apontamentos/comentários (histórico cronológico);
é a documentação organizada e atualizável do ticket. Ver schema em
[`database.md`](./database.md) e decisões técnicas em [`decisions.md`](./decisions.md).

### Biblioteca do editor

**MDXEditor** (`@mdxeditor/editor`, sobre Lexical) — escolhida porque trata Markdown como fonte
real (não um JSON que é exportado pra Markdown de forma aproximada, como no BlockNote), é React
nativo, e expõe uma API pública de extensão (plugins, diretivas Markdown, editores de bloco de
código customizados, sinais `insertX$`/`useCellValue`/`usePublisher`) suficiente pra cobrir todo
o pedido sem escrever um editor do zero. Ver `src/renderer/src/components/notebook/`.

### Blocos personalizados (todos Markdown puro, portáteis fora do app)

| Recurso | Sintaxe Markdown | Implementação |
|---|---|---|
| Bloco de informação/aviso/erro/sucesso | `:::info` / `:::caution` / `:::danger` / `:::tip` | `AdmonitionDirectiveDescriptor` (nativo do MDXEditor) |
| Seção recolhível | `:::details{title="..."}` | `plugins/detailsDirective.tsx` → `<details>` real |
| Fórmula (KaTeX) | `::math[...]` (bloco) / `:math[...]` (inline) | `plugins/mathDirectives.tsx` |
| Texto destacado | `:mark[...]` | `plugins/markDirective.tsx` → `<mark>` |
| Palavra-chave (`#frontend`) | `#palavra` no Markdown salvo; `:tag[palavra]` só em memória | `plugins/hashtagTransform.ts` + `plugins/tagDirective.tsx` |
| Diagrama | ` ```mermaid ` | `plugins/mermaidCodeBlock.tsx` (renderiza com a lib `mermaid`) |
| Gráfico | ` ```chart ` (corpo = JSON: tipo + linhas) | `plugins/chartCodeBlock.tsx` + `ChartDataDialog.tsx` (lib `recharts`) |
| Link para outro card | `[Título](card://id)` | link Markdown normal; clique interceptado em `CardNotebook.handleContentClick` |

Diretivas usam a sintaxe de [`remark-directive`](https://github.com/micromark/micromark-extension-directive)
(`:nome[]`, `::nome[]`, `:::nome`), suportada nativamente pelo MDXEditor via `directivesPlugin`.

### Palavras-chave (`#tag`)

O MDXEditor não expõe API pública pra registrar nós Lexical customizados (só diretivas
Markdown), então `#palavra` não pode virar um chip colorido "ao vivo" enquanto o usuário digita
sem isso. Solução: o Markdown **salvo no banco** guarda `#palavra` literal (portátil, grep-ável
fora do app); na borda com o editor (`expandHashtagsForEditor`/`collapseHashtagsForStorage`),
convertemos pra `:tag[palavra]` só em memória, que tem editor visual próprio. A conversão nunca
mexe em conteúdo dentro de bloco de código ou crases.

### Comandos "/"

O MDXEditor não tem um menu "/" nativo (diferente do BlockNote). `plugins/slashMenu.tsx`
implementa um usando só a API pública: escuta `input`/`keydown` no elemento raiz do editor
(`editorRootElementRef$`), calcula a posição do popup pela `Range` da seleção, e ao confirmar um
comando apaga o texto `/consulta` digitado (seleciona o intervalo e usa
`document.execCommand('delete')`, que passa pelo pipeline nativo de edição que o Lexical já
escuta) e executa a ação via sinais públicos (`insertMarkdown$`, `insertCodeBlock$`,
`insertTable$`, `insertDirective$`, `applyListType$`, `convertSelectionToNode$`). Renderizado
como *top area child* (`addTopAreaChild$`) — o único ponto de extensão que roda **dentro** da
árvore/realm do MDXEditor, por isso os hooks `usePublisher`/`useCellValue` funcionam nele.

### Imagens

Colar (`Ctrl+V`), arrastar/soltar e selecionar usam o mesmo `imageUploadHandler` do
`imagePlugin` (`plugins/imageUpload.ts`): a imagem é gravada como anexo do card (mesmo storage
de `attachmentService`, nunca Base64) e o Markdown guarda só
`ldattach://<cardId>/<attachmentId>`. Esse esquema customizado é registrado no processo main
(`protocol.handle('ldattach', ...)` em `src/main/index.ts`) e resolve o arquivo verificando que
o `cardId` da URL bate com o dono real do anexo — um caderno não consegue puxar o anexo de
outro card. Redimensionar/alinhar imagem **não foi implementado**: o MDXEditor não tem suporte
nativo a isso (exigiria um nó de imagem customizado, fora do escopo de "não construir um editor
do zero") — ver limitações em `docs/roadmap.md`.

### Salvamento

Autosave com debounce de 1,2s (`CardNotebook.scheduleSave`), indicador Salvando/Salvo/Erro,
save forçado no `unmount` do componente (sair da aba/tela não perde edição pendente). Trava
otimista: cada save exige a `baseVersion` lida por último; se não bater (outra janela salvou
por cima), o save é recusado e a UI oferece recarregar a versão mais recente ou sobrescrever
mesmo assim — nunca sobrescreve silenciosamente. Histórico de versões: cada save grava um
snapshot em `notebook_versions`; restaurar uma versão antiga grava o conteúdo dela como uma
versão **nova** (histórico nunca é apagado).

### Sem sistema de usuários

LearnDeck é um app desktop **single-user local** (sem tabela `users`, sem login). A spec original
pedia "permissões" e "usuário responsável pela última edição" — como não existe conceito de
usuário no app, essas partes foram simplificadas: o caderno segue as mesmas (ausência de)
permissões de todo o resto do app, e o registro de autoria não se aplica — só `updatedAt` é
mostrado. Ver [`decisions.md`](./decisions.md).

## Preparando o terreno para o futuro (sem implementar agora)

- **Dashboard/métricas**: as tabelas (`study_sessions`, `pomodoros`, `status_history`) já
  guardam timestamps granulares o suficiente para agregações futuras (hoje, semana, por
  matéria) sem precisar de migração de schema.
- **Sync/backup em nuvem**: cada tabela tem `id` (UUID, não autoincrement puro) e
  `updated_at`, pensando em uma futura sincronização incremental (comparar timestamps) sem
  precisar trocar chaves primárias depois. Ver [`decisions.md`](./decisions.md).
- **Multi-workspace**: o schema já tem uma tabela `workspaces` isolada (mesmo com um único
  registro no MVP), então oferecer múltiplos workspaces no futuro é inserir linhas, não
  redesenhar o banco.
