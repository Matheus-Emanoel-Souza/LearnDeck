# Arquitetura — LearnDeck

## Visão geral

LearnDeck é um aplicativo **desktop, 100% local e offline**, para gerenciar estudos através de
cards em um quadro estilo Kanban, com cronômetro, Pomodoro, comentários, histórico e
relacionamentos entre cards.

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
│   │       ├── App.tsx
│   │       ├── pages/          # KanbanBoard, CardDetail, ...
│   │       ├── components/     # Componentes reutilizáveis
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
