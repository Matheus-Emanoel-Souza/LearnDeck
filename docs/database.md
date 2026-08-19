# Banco de dados — LearnDeck

SQLite, arquivo único em `%APPDATA%\LearnDeck\learndeck.db` (Windows). Acesso via
`better-sqlite3`, apenas pelo processo main.

## Convenções

- Toda tabela tem `id TEXT PRIMARY KEY` (UUID v4), não `INTEGER AUTOINCREMENT`. Facilita uma
  futura sincronização/merge entre dispositivos sem colisão de chave.
- Toda tabela tem `created_at TEXT` e, quando fizer sentido editar o registro, `updated_at TEXT`
  (ambos `ISO 8601` em UTC, armazenados como texto — abordagem padrão e mais simples em SQLite).
- Deleções são **lógicas** (`deleted_at TEXT NULL`) nas tabelas centrais (`groups`, `cards`),
  para não perder histórico/sessões associadas por engano. Tabelas de log (`status_history`,
  `study_sessions`, `pomodoros`) não são deletadas por soft-delete — só existem para registrar
  fatos que já aconteceram.
- Chaves estrangeiras com `ON DELETE CASCADE` onde a entidade filha não faz sentido sem o pai
  (ex.: comentário sem card).

## Diagrama de entidades

```text
workspaces
   ├─< board_columns (colunas dinâmicas do Kanban, por workspace)
   ├─< notifications
   └─< groups (self-referencing: parent_group_id) >─┐
                                                       │
                                                       ▼
                                                     cards ──> board_columns (column_id)
                                                    ┌──┼───────────────────────────┐
                                                    │  │                           │
                                             comments  status_history   card_tags >─< tags
                                                    │
                            ┌───────────┬───────────┼───────────────┬─────────────┐
                            ▼           ▼           ▼               ▼             ▼
                     study_sessions  pomodoros  card_relations  attachments   subtasks
                                                  (card_id,                   (prazo próprio,
                                                   related_card_id)            is_done)
```

## Tabelas

### `workspaces`

Preparado para múltiplos workspaces no futuro; no MVP haverá um único registro criado no
primeiro boot.

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT | Ex.: "Meus estudos" |
| created_at | TEXT | |

### `groups`

Matérias/projetos/pastas, hierárquicos (`Faculdade > Cálculo > Integrais`).

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| workspace_id | TEXT FK → workspaces.id | |
| parent_group_id | TEXT FK → groups.id, NULL | permite hierarquia arbitrária |
| name | TEXT | |
| color | TEXT NULL | cor de destaque no Kanban/dashboard futuro |
| position | INTEGER | ordenação manual entre grupos irmãos |
| created_at | TEXT | |
| updated_at | TEXT | |
| deleted_at | TEXT NULL | soft delete |

### `board_columns`

Colunas do quadro Kanban — deixaram de ser um enum fixo (`001_init.sql`) e viraram dados
editáveis por workspace (`002_board_columns.sql`): criar, renomear, reordenar, colorir,
duplicar e excluir (só se vazia) pelo menu de contexto (botão direito) no cabeçalho da coluna.

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| workspace_id | TEXT FK → workspaces.id (CASCADE) | |
| name | TEXT | |
| position | INTEGER | ordenação das colunas no quadro |
| is_done | INTEGER (0/1) | marca a(s) coluna(s) que contam como "concluído" no dashboard/prazos |
| color | TEXT NULL | cor de destaque no cabeçalho da coluna (`003_column_color.sql`) |
| created_at | TEXT | |
| updated_at | TEXT | |

### `cards`

A entidade central — um "assunto de estudo".

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| group_id | TEXT FK → groups.id | |
| title | TEXT | |
| description | TEXT NULL | markdown livre |
| column_id | TEXT FK → board_columns.id | substitui o antigo enum `status` fixo — ver `board_columns` acima |
| position | INTEGER | ordenação dentro da coluna do Kanban |
| total_study_seconds | INTEGER | **campo desnormalizado**, cache da soma de `study_sessions`; recalculado pelo `TimerService` a cada sessão fechada, para não somar em runtime a cada render |
| pomodoros_completed | INTEGER | idem, cache da contagem de `pomodoros` concluídos |
| due_date | TEXT NULL | prazo opcional (`005_deadlines_subtasks_notifications.sql`) |
| due_time | TEXT NULL | horário do prazo, opcional (só relevante se `due_date` estiver preenchido) |
| created_at | TEXT | |
| updated_at | TEXT | |
| deleted_at | TEXT NULL | soft delete |

> Os dois campos desnormalizados (`total_study_seconds`, `pomodoros_completed`) são uma
> escolha deliberada de performance simples — ver [`decisions.md`](./decisions.md). A fonte
> da verdade continua sendo `study_sessions`/`pomodoros`; esses campos podem sempre ser
> recalculados a partir delas (rotina de "recalcular" fica fácil de adicionar depois).

### `status_history`

Toda mudança de status de um card gera uma linha aqui — nunca é editada, só inserida.

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| card_id | TEXT FK → cards.id (CASCADE) | |
| from_status | TEXT NULL | NULL na criação do card; guardava o enum fixo, hoje guarda o `id` da coluna (`board_columns`) |
| to_status | TEXT | idem — id da coluna, texto livre desde a `002_board_columns.sql` |
| changed_at | TEXT | |

### `comments`

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| card_id | TEXT FK → cards.id (CASCADE) | |
| body | TEXT | |
| created_at | TEXT | |
| updated_at | TEXT | |

### `tags` / `card_tags`

| `tags` | Tipo |
|---|---|
| id | TEXT PK |
| name | TEXT UNIQUE |
| color | TEXT NULL |

| `card_tags` | Tipo |
|---|---|
| card_id | TEXT FK → cards.id (CASCADE) |
| tag_id | TEXT FK → tags.id (CASCADE) |

Chave primária composta `(card_id, tag_id)`.

### `study_sessions`

Uma linha por sessão de cronômetro (iniciar/parar).

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| card_id | TEXT FK → cards.id (CASCADE) | |
| started_at | TEXT | |
| ended_at | TEXT NULL | NULL enquanto a sessão está rodando (só pode existir **uma** sessão aberta por card por vez — regra aplicada no `TimerService`, não no schema) |
| duration_seconds | INTEGER NULL | calculado ao fechar a sessão |
| source | TEXT | `'manual'` ou `'pomodoro'` (sessão criada automaticamente por um ciclo de foco do Pomodoro) |

### `pomodoro_configs`

Configuração de Pomodoro. Uma linha global (`card_id IS NULL`) como padrão, e opcionalmente
uma linha por card sobrescrevendo o padrão (feature "configurável" pedida, mantendo o padrão
simples no MVP: só a config global é editável na v1).

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| card_id | TEXT FK → cards.id, NULL = configuração global | |
| focus_minutes | INTEGER | padrão 25 |
| short_break_minutes | INTEGER | padrão 5 |
| long_break_minutes | INTEGER | padrão 15 |
| cycles_before_long_break | INTEGER | padrão 4 |

### `pomodoros`

Uma linha por ciclo de Pomodoro concluído (ou interrompido) associado a um card.

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| card_id | TEXT FK → cards.id (CASCADE) | |
| kind | TEXT | `'focus'`, `'short_break'`, `'long_break'` |
| started_at | TEXT | |
| ended_at | TEXT NULL | |
| completed | INTEGER (0/1) | `1` se o ciclo terminou naturalmente, `0` se foi cancelado |
| study_session_id | TEXT FK → study_sessions.id, NULL | liga o ciclo de foco à sessão de cronômetro que ele gerou |

### `card_relations`

Relacionamentos direcionados entre cards (`Estudar derivadas → pré-requisito de → Estudar integrais`).

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| card_id | TEXT FK → cards.id (CASCADE) | origem |
| related_card_id | TEXT FK → cards.id (CASCADE) | destino |
| relation_type | TEXT | enum: `prerequisite_of`, `blocks`, `related_to`, `part_of` |
| created_at | TEXT | |

`UNIQUE(card_id, related_card_id, relation_type)` para evitar duplicatas.

### `attachments`

Arquivos anexados a um card (`004_attachments.sql`). O arquivo em si é **copiado** para
`%APPDATA%\LearnDeck\attachments\<card_id>\<uuid>-<nome>`; esta tabela só guarda os metadados
— abrir o arquivo (`shell.openPath`) e removê-lo (do disco + da tabela) são operações do
`AttachmentService` no processo main.

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| card_id | TEXT FK → cards.id (CASCADE) | |
| file_name | TEXT | nome original do arquivo |
| stored_path | TEXT | caminho absoluto na pasta de dados do app |
| mime_type | TEXT NULL | |
| size_bytes | INTEGER | |
| created_at | TEXT | |

### `subtasks`

Subtarefas de um card, com prazo próprio independente do prazo do card pai
(`005_deadlines_subtasks_notifications.sql`).

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| card_id | TEXT FK → cards.id (CASCADE) | |
| title | TEXT | |
| is_done | INTEGER (0/1) | |
| due_date | TEXT NULL | prazo próprio, opcional |
| due_time | TEXT NULL | |
| position | INTEGER | ordenação manual na lista de subtarefas |
| created_at | TEXT | |
| updated_at | TEXT | |

### `notebooks` / `notebook_versions`

Caderno do card (`006_notebooks.sql`) — documentação técnica em Markdown, 1:1 com o card
(`card_id UNIQUE`), criado sob demanda no primeiro save. `version` é a trava otimista usada
pelo autosave (ver `docs/architecture.md#caderno-do-card`); cada save bem-sucedido também grava
um snapshot em `notebook_versions`, formando o histórico (nunca apagado, nem ao restaurar uma
versão antiga).

| Coluna (`notebooks`) | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| card_id | TEXT FK → cards.id (CASCADE), UNIQUE | 1 caderno por card |
| content_markdown | TEXT | fonte da verdade — Markdown puro, incluindo as diretivas dos blocos personalizados |
| version | INTEGER | sobe 1 a cada save; usada como trava otimista |
| created_at | TEXT | |
| updated_at | TEXT | |

| Coluna (`notebook_versions`) | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| notebook_id | TEXT FK → notebooks.id (CASCADE) | |
| version | INTEGER | mesma numeração de `notebooks.version` no momento do save |
| content_markdown | TEXT | snapshot completo daquela versão |
| created_at | TEXT | |

Não há tabela de usuários no app (single-user local — ver `docs/decisions.md`), então não existe
coluna de "autor da edição"; só `updated_at` é rastreado.

### `notifications`

Alertas de vencimento gerados pelo `notificationService` (card ou subtarefa atrasados), lidos
na Central de Notificações. Deduplicadas: reescanear prazos vencidos nunca insere duas
notificações para o mesmo vencimento exato.

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| workspace_id | TEXT FK → workspaces.id (CASCADE) | |
| kind | TEXT | enum: `card`, `subtask` |
| card_id | TEXT FK → cards.id (CASCADE) | |
| subtask_id | TEXT FK → subtasks.id (CASCADE), NULL | preenchido só quando `kind = 'subtask'` |
| message | TEXT | ex.: `O ticket "..." venceu` |
| due_at | TEXT | vencimento exato (ISO) que gerou o alerta |
| is_read | INTEGER (0/1) | |
| created_at | TEXT | |

`UNIQUE(kind, card_id, COALESCE(subtask_id, ''), due_at)` é a chave de deduplicação.

## Índices previstos

- `groups(workspace_id)`, `groups(parent_group_id)`
- `board_columns(workspace_id)`
- `cards(group_id)`, `cards(column_id)`, `cards(due_date)`
- `status_history(card_id)`
- `comments(card_id)`
- `study_sessions(card_id)`, `study_sessions(started_at)` (para agregações de dashboard: hoje/semana)
- `pomodoros(card_id)`
- `card_relations(card_id)`, `card_relations(related_card_id)`
- `attachments(card_id)`
- `subtasks(card_id)`, `subtasks(due_date)`
- `notifications(workspace_id)`, `notifications(workspace_id, is_read)`
- `notebook_versions(notebook_id, version DESC)`

## Migrations

Scripts SQL puros e sequenciais em `src/main/db/migrations/NNN_descricao.sql`. Uma tabela
`schema_migrations (version INTEGER PK, applied_at TEXT)` registra o que já rodou. O runner
(`src/main/db/migrate.ts`) roda no boot do app, dentro de uma transação, aplicando apenas as
migrations pendentes — sem dependência externa (nada de `knex`/`prisma migrate`).

| Migration | O que muda |
|---|---|
| `001_init.sql` | Schema inicial (workspaces, groups, cards com `status` enum fixo, comments, tags, sessions, pomodoros, relations) |
| `002_board_columns.sql` | Colunas do Kanban viram dados (`board_columns`); `cards.status` (enum) vira `cards.column_id` (FK livre); reescreve `status_history` para os novos ids |
| `003_column_color.sql` | Adiciona `board_columns.color` |
| `004_attachments.sql` | Tabela `attachments` |
| `005_deadlines_subtasks_notifications.sql` | `cards.due_date`/`due_time`, tabelas `subtasks` e `notifications` |
| `006_notebooks.sql` | Tabelas `notebooks` e `notebook_versions` (Caderno do card) |
