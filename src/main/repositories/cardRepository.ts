import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Card, CardSummary, CreateCardInput, UpdateCardInput } from '@shared/types'

interface CardRow {
  id: string
  group_id: string
  title: string
  description: string | null
  column_id: string
  position: number
  total_study_seconds: number
  pomodoros_completed: number
  due_date: string | null
  due_time: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function toCard(row: CardRow): Card {
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    description: row.description,
    columnId: row.column_id,
    position: row.position,
    totalStudySeconds: row.total_study_seconds,
    pomodorosCompleted: row.pomodoros_completed,
    dueDate: row.due_date,
    dueTime: row.due_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

export function getWorkspaceIdForCard(db: Database.Database, cardId: string): string | undefined {
  const row = db
    .prepare(
      `SELECT g.workspace_id AS workspace_id FROM cards c
       JOIN groups g ON g.id = c.group_id
       WHERE c.id = ?`
    )
    .get(cardId) as { workspace_id: string } | undefined
  return row?.workspace_id
}

export function getCard(db: Database.Database, id: string): Card | undefined {
  const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow | undefined
  return row ? toCard(row) : undefined
}

/** Cards de um grupo específico (não inclui subgrupos — ver docs/roadmap.md, Fase 2). */
export function listCardsByGroup(db: Database.Database, groupId: string): Card[] {
  const rows = db
    .prepare(
      `SELECT * FROM cards WHERE group_id = ? AND deleted_at IS NULL ORDER BY position ASC, created_at ASC`
    )
    .all(groupId) as CardRow[]
  return rows.map(toCard)
}

/** Todos os cards não excluídos de um conjunto de grupos (usado para listar por workspace). */
export function listCardsByGroups(db: Database.Database, groupIds: string[]): Card[] {
  if (groupIds.length === 0) return []
  const placeholders = groupIds.map(() => '?').join(', ')
  const rows = db
    .prepare(
      `SELECT * FROM cards WHERE group_id IN (${placeholders}) AND deleted_at IS NULL
       ORDER BY position ASC, created_at ASC`
    )
    .all(...groupIds) as CardRow[]
  return rows.map(toCard)
}

/** Cria o card na coluna informada (o CardService resolve a coluna padrão do workspace). */
export function insertCardRow(db: Database.Database, input: CreateCardInput, columnId: string): Card {
  const now = new Date().toISOString()
  const nextPosition = (
    db
      .prepare(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards
         WHERE group_id = ? AND deleted_at IS NULL`
      )
      .get(input.groupId) as { next: number }
  ).next

  const row: CardRow = {
    id: randomUUID(),
    group_id: input.groupId,
    title: input.title.trim(),
    description: input.description ?? null,
    column_id: columnId,
    position: nextPosition,
    total_study_seconds: 0,
    pomodoros_completed: 0,
    due_date: input.dueDate ?? null,
    due_time: input.dueTime ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null
  }

  db.prepare(
    `INSERT INTO cards (id, group_id, title, description, column_id, position, total_study_seconds,
       pomodoros_completed, due_date, due_time, created_at, updated_at, deleted_at)
     VALUES (@id, @group_id, @title, @description, @column_id, @position, @total_study_seconds,
       @pomodoros_completed, @due_date, @due_time, @created_at, @updated_at, @deleted_at)`
  ).run(row)

  return toCard(row)
}

/** Cards não excluídos de uma coluna, workspace inteiro (colunas não são por grupo). */
export function listCardsByColumnId(db: Database.Database, columnId: string): Card[] {
  const rows = db
    .prepare('SELECT * FROM cards WHERE column_id = ? AND deleted_at IS NULL')
    .all(columnId) as CardRow[]
  return rows.map(toCard)
}

/** Duplica um card (novo id, mesmo título/descrição/grupo/posição) numa coluna
 * de destino, com estatísticas zeradas — usado por "Duplicar coluna". */
export function duplicateCardRow(db: Database.Database, source: Card, columnId: string): Card {
  const now = new Date().toISOString()
  const row: CardRow = {
    id: randomUUID(),
    group_id: source.groupId,
    title: source.title,
    description: source.description,
    column_id: columnId,
    position: source.position,
    total_study_seconds: 0,
    pomodoros_completed: 0,
    due_date: source.dueDate,
    due_time: source.dueTime,
    created_at: now,
    updated_at: now,
    deleted_at: null
  }

  db.prepare(
    `INSERT INTO cards (id, group_id, title, description, column_id, position, total_study_seconds,
       pomodoros_completed, due_date, due_time, created_at, updated_at, deleted_at)
     VALUES (@id, @group_id, @title, @description, @column_id, @position, @total_study_seconds,
       @pomodoros_completed, @due_date, @due_time, @created_at, @updated_at, @deleted_at)`
  ).run(row)

  return toCard(row)
}

export function updateCardRow(db: Database.Database, id: string, patch: UpdateCardInput): Card {
  const current = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow | undefined
  if (!current) throw new Error(`Card não encontrado: ${id}`)

  const updated: CardRow = {
    ...current,
    title: patch.title?.trim() ?? current.title,
    description: patch.description !== undefined ? patch.description : current.description,
    column_id: patch.columnId ?? current.column_id,
    position: patch.position ?? current.position,
    due_date: patch.dueDate !== undefined ? patch.dueDate : current.due_date,
    due_time: patch.dueTime !== undefined ? patch.dueTime : current.due_time,
    updated_at: new Date().toISOString()
  }

  db.prepare(
    `UPDATE cards SET title = @title, description = @description, column_id = @column_id,
       position = @position, due_date = @due_date, due_time = @due_time, updated_at = @updated_at
       WHERE id = @id`
  ).run(updated)

  return toCard(updated)
}

/** Cards não excluídos do workspace que têm prazo definido — usado pelo
 * calendário e pelo scan de notificações de atraso. */
export function listCardsWithDueDate(db: Database.Database, workspaceId: string): Card[] {
  const rows = db
    .prepare(
      `SELECT c.* FROM cards c
       JOIN groups g ON g.id = c.group_id
       WHERE g.workspace_id = ? AND c.deleted_at IS NULL AND c.due_date IS NOT NULL`
    )
    .all(workspaceId) as CardRow[]
  return rows.map(toCard)
}

export function softDeleteCard(db: Database.Database, id: string): void {
  db.prepare('UPDATE cards SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), id)
}

/** Recalcula o total_study_seconds desnormalizado do card a partir das sessões fechadas. */
export function setCardTotalStudySeconds(db: Database.Database, cardId: string, totalSeconds: number): void {
  db.prepare('UPDATE cards SET total_study_seconds = ?, updated_at = ? WHERE id = ?').run(
    totalSeconds,
    new Date().toISOString(),
    cardId
  )
}

export function incrementCardPomodorosCompleted(db: Database.Database, cardId: string): void {
  db.prepare(
    'UPDATE cards SET pomodoros_completed = pomodoros_completed + 1, updated_at = ? WHERE id = ?'
  ).run(new Date().toISOString(), cardId)
}

/** Busca cards do workspace inteiro por título (para relacionar cards entre grupos diferentes). */
export function searchCardsInWorkspace(
  db: Database.Database,
  workspaceId: string,
  query: string,
  excludeCardId: string
): CardSummary[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.group_id, c.title, c.column_id FROM cards c
       JOIN groups g ON g.id = c.group_id
       WHERE g.workspace_id = ? AND c.deleted_at IS NULL AND c.id != ?
         AND c.title LIKE ? ESCAPE '\\'
       ORDER BY c.title ASC
       LIMIT 20`
    )
    .all(workspaceId, excludeCardId, `%${query.replace(/[%_\\]/g, '\\$&')}%`) as Array<{
    id: string
    group_id: string
    title: string
    column_id: string
  }>

  return rows.map((row) => ({ id: row.id, groupId: row.group_id, title: row.title, columnId: row.column_id }))
}

/** Todos os cards do workspace, em resumo — usado pelo seletor "relacionar com" para listar tudo de uma vez. */
export function listAllCardSummariesInWorkspace(
  db: Database.Database,
  workspaceId: string,
  excludeCardId: string
): CardSummary[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.group_id, c.title, c.column_id FROM cards c
       JOIN groups g ON g.id = c.group_id
       WHERE g.workspace_id = ? AND c.deleted_at IS NULL AND c.id != ?
       ORDER BY c.title ASC`
    )
    .all(workspaceId, excludeCardId) as Array<{
    id: string
    group_id: string
    title: string
    column_id: string
  }>

  return rows.map((row) => ({ id: row.id, groupId: row.group_id, title: row.title, columnId: row.column_id }))
}

/** Todos os cards não excluídos de um workspace (usado pelo dashboard para contagens/agregações). */
export function listCardsForWorkspace(db: Database.Database, workspaceId: string): Card[] {
  const rows = db
    .prepare(
      `SELECT c.* FROM cards c
       JOIN groups g ON g.id = c.group_id
       WHERE g.workspace_id = ? AND c.deleted_at IS NULL`
    )
    .all(workspaceId) as CardRow[]
  return rows.map(toCard)
}

/** Cards abertos (coluna sem is_done) agrupados pela matéria (grupo raiz) — gráfico de pizza do dashboard. */
export function countOpenCardsBySubject(
  db: Database.Database,
  workspaceId: string
): Array<{ groupId: string; groupName: string; openCount: number }> {
  const rows = db
    .prepare(
      `WITH RECURSIVE group_roots(id, root_id) AS (
         SELECT id, id FROM groups WHERE workspace_id = @workspaceId AND parent_group_id IS NULL
         UNION ALL
         SELECT g.id, gr.root_id
         FROM groups g
         JOIN group_roots gr ON g.parent_group_id = gr.id
       )
       SELECT gr.root_id AS group_id, root.name AS group_name, COUNT(c.id) AS open_count
       FROM group_roots gr
       JOIN groups root ON root.id = gr.root_id
       JOIN cards c ON c.group_id = gr.id AND c.deleted_at IS NULL
       JOIN board_columns bc ON bc.id = c.column_id AND bc.is_done = 0
       GROUP BY gr.root_id, root.name
       ORDER BY root.name ASC`
    )
    .all({ workspaceId }) as Array<{ group_id: string; group_name: string; open_count: number }>

  return rows.map((row) => ({ groupId: row.group_id, groupName: row.group_name, openCount: row.open_count }))
}

/** Cards criados por dia, nos últimos `days` dias — gráfico de linha do dashboard. */
export function countCardsCreatedByDay(
  db: Database.Database,
  workspaceId: string,
  days: number
): Array<{ date: string; count: number }> {
  const rows = db
    .prepare(
      `SELECT date(c.created_at) AS day, COUNT(*) AS count
       FROM cards c
       JOIN groups g ON g.id = c.group_id
       WHERE g.workspace_id = @workspaceId AND c.deleted_at IS NULL
         AND date(c.created_at) >= date('now', @offset)
       GROUP BY day`
    )
    .all({ workspaceId, offset: `-${days - 1} days` }) as Array<{ day: string; count: number }>

  return rows.map((row) => ({ date: row.day, count: row.count }))
}

export function insertStatusHistory(
  db: Database.Database,
  cardId: string,
  fromColumnId: string | null,
  toColumnId: string
): void {
  db.prepare(
    `INSERT INTO status_history (id, card_id, from_status, to_status, changed_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(randomUUID(), cardId, fromColumnId, toColumnId, new Date().toISOString())
}
