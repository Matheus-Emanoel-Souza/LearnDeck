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
   └─< groups (self-referencing: parent_group_id) >─┐
                                                       │
                                                       ▼
                                                     cards
                                                    ┌──┼──────────────────────┐
                                                    │  │                      │
                                             comments  status_history   card_tags >─< tags
                                                    │
                                        ┌───────────┼───────────────┐
                                        ▼           ▼               ▼
                                 study_sessions  pomodoros    card_relations
                                                                (card_id, related_card_id)
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

### `cards`

A entidade central — um "assunto de estudo".

| Coluna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| group_id | TEXT FK → groups.id | |
| title | TEXT | |
| description | TEXT NULL | markdown livre |
| status | TEXT | enum: `backlog`, `to_study`, `studying`, `paused`, `review`, `done` |
| position | INTEGER | ordenação dentro da coluna do Kanban |
| total_study_seconds | INTEGER | **campo desnormalizado**, cache da soma de `study_sessions`; recalculado pelo `TimerService` a cada sessão fechada, para não somar em runtime a cada render |
| pomodoros_completed | INTEGER | idem, cache da contagem de `pomodoros` concluídos |
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
| from_status | TEXT NULL | NULL na criação do card |
| to_status | TEXT | |
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

## Índices previstos

- `groups(workspace_id)`, `groups(parent_group_id)`
- `cards(group_id)`, `cards(status)`
- `status_history(card_id)`
- `comments(card_id)`
- `study_sessions(card_id)`, `study_sessions(started_at)` (para agregações de dashboard: hoje/semana)
- `pomodoros(card_id)`
- `card_relations(card_id)`, `card_relations(related_card_id)`

## Migrations

Scripts SQL puros e sequenciais em `src/main/db/migrations/NNN_descricao.sql`. Uma tabela
`schema_migrations (version INTEGER PK, applied_at TEXT)` registra o que já rodou. O runner
(`src/main/db/migrate.ts`) roda no boot do app, dentro de uma transação, aplicando apenas as
migrations pendentes — sem dependência externa (nada de `knex`/`prisma migrate`).
