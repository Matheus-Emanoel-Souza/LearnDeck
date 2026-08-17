import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { CreateSubtaskInput, Subtask, UpdateSubtaskInput } from '@shared/types'

interface SubtaskRow {
  id: string
  card_id: string
  title: string
  is_done: number
  due_date: string | null
  due_time: string | null
  position: number
  created_at: string
  updated_at: string
}

function toSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    cardId: row.card_id,
    title: row.title,
    isDone: row.is_done === 1,
    dueDate: row.due_date,
    dueTime: row.due_time,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getSubtask(db: Database.Database, id: string): Subtask | undefined {
  const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as SubtaskRow | undefined
  return row ? toSubtask(row) : undefined
}

export function listSubtasksByCard(db: Database.Database, cardId: string): Subtask[] {
  const rows = db
    .prepare('SELECT * FROM subtasks WHERE card_id = ? ORDER BY position ASC, created_at ASC')
    .all(cardId) as SubtaskRow[]
  return rows.map(toSubtask)
}

/** Subtarefas não concluídas do workspace que têm prazo — calendário + scan de notificações. */
export function listSubtasksWithDueDate(db: Database.Database, workspaceId: string): Subtask[] {
  const rows = db
    .prepare(
      `SELECT s.* FROM subtasks s
       JOIN cards c ON c.id = s.card_id
       JOIN groups g ON g.id = c.group_id
       WHERE g.workspace_id = ? AND c.deleted_at IS NULL AND s.due_date IS NOT NULL`
    )
    .all(workspaceId) as SubtaskRow[]
  return rows.map(toSubtask)
}

export function insertSubtaskRow(db: Database.Database, input: CreateSubtaskInput): Subtask {
  const now = new Date().toISOString()
  const nextPosition = (
    db
      .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM subtasks WHERE card_id = ?')
      .get(input.cardId) as { next: number }
  ).next

  const row: SubtaskRow = {
    id: randomUUID(),
    card_id: input.cardId,
    title: input.title.trim(),
    is_done: 0,
    due_date: input.dueDate ?? null,
    due_time: input.dueTime ?? null,
    position: nextPosition,
    created_at: now,
    updated_at: now
  }

  db.prepare(
    `INSERT INTO subtasks (id, card_id, title, is_done, due_date, due_time, position, created_at, updated_at)
     VALUES (@id, @card_id, @title, @is_done, @due_date, @due_time, @position, @created_at, @updated_at)`
  ).run(row)

  return toSubtask(row)
}

export function updateSubtaskRow(db: Database.Database, id: string, patch: UpdateSubtaskInput): Subtask {
  const current = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as SubtaskRow | undefined
  if (!current) throw new Error(`Subtarefa não encontrada: ${id}`)

  const updated: SubtaskRow = {
    ...current,
    title: patch.title?.trim() ?? current.title,
    is_done: patch.isDone !== undefined ? (patch.isDone ? 1 : 0) : current.is_done,
    due_date: patch.dueDate !== undefined ? patch.dueDate : current.due_date,
    due_time: patch.dueTime !== undefined ? patch.dueTime : current.due_time,
    position: patch.position ?? current.position,
    updated_at: new Date().toISOString()
  }

  db.prepare(
    `UPDATE subtasks SET title = @title, is_done = @is_done, due_date = @due_date, due_time = @due_time,
       position = @position, updated_at = @updated_at WHERE id = @id`
  ).run(updated)

  return toSubtask(updated)
}

export function deleteSubtaskRow(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM subtasks WHERE id = ?').run(id)
}
