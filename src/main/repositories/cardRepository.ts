import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Card, CardStatus, CardSummary, CreateCardInput, UpdateCardInput } from '@shared/types'

interface CardRow {
  id: string
  group_id: string
  title: string
  description: string | null
  status: CardStatus
  position: number
  total_study_seconds: number
  pomodoros_completed: number
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
    status: row.status,
    position: row.position,
    totalStudySeconds: row.total_study_seconds,
    pomodorosCompleted: row.pomodoros_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
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

export function insertCardRow(db: Database.Database, input: CreateCardInput): Card {
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
    status: 'backlog',
    position: nextPosition,
    total_study_seconds: 0,
    pomodoros_completed: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null
  }

  db.prepare(
    `INSERT INTO cards (id, group_id, title, description, status, position, total_study_seconds,
       pomodoros_completed, created_at, updated_at, deleted_at)
     VALUES (@id, @group_id, @title, @description, @status, @position, @total_study_seconds,
       @pomodoros_completed, @created_at, @updated_at, @deleted_at)`
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
    status: patch.status ?? current.status,
    position: patch.position ?? current.position,
    updated_at: new Date().toISOString()
  }

  db.prepare(
    `UPDATE cards SET title = @title, description = @description, status = @status,
       position = @position, updated_at = @updated_at WHERE id = @id`
  ).run(updated)

  return toCard(updated)
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
      `SELECT c.id, c.group_id, c.title, c.status FROM cards c
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
    status: CardStatus
  }>

  return rows.map((row) => ({ id: row.id, groupId: row.group_id, title: row.title, status: row.status }))
}

/** Todos os cards do workspace, em resumo — usado pelo seletor "relacionar com" para listar tudo de uma vez. */
export function listAllCardSummariesInWorkspace(
  db: Database.Database,
  workspaceId: string,
  excludeCardId: string
): CardSummary[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.group_id, c.title, c.status FROM cards c
       JOIN groups g ON g.id = c.group_id
       WHERE g.workspace_id = ? AND c.deleted_at IS NULL AND c.id != ?
       ORDER BY c.title ASC`
    )
    .all(workspaceId, excludeCardId) as Array<{
    id: string
    group_id: string
    title: string
    status: CardStatus
  }>

  return rows.map((row) => ({ id: row.id, groupId: row.group_id, title: row.title, status: row.status }))
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

export function insertStatusHistory(
  db: Database.Database,
  cardId: string,
  fromStatus: CardStatus | null,
  toStatus: CardStatus
): void {
  db.prepare(
    `INSERT INTO status_history (id, card_id, from_status, to_status, changed_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(randomUUID(), cardId, fromStatus, toStatus, new Date().toISOString())
}
