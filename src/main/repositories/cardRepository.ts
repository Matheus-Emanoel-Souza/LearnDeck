import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Card, CardStatus, CreateCardInput, UpdateCardInput } from '@shared/types'

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
