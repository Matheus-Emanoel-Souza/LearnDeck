import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Comment } from '@shared/types'

interface CommentRow {
  id: string
  card_id: string
  body: string
  created_at: string
  updated_at: string
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    cardId: row.card_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listCommentsByCard(db: Database.Database, cardId: string): Comment[] {
  const rows = db
    .prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC')
    .all(cardId) as CommentRow[]
  return rows.map(toComment)
}

export function createComment(db: Database.Database, cardId: string, body: string): Comment {
  const now = new Date().toISOString()
  const row: CommentRow = { id: randomUUID(), card_id: cardId, body: body.trim(), created_at: now, updated_at: now }

  db.prepare(
    `INSERT INTO comments (id, card_id, body, created_at, updated_at)
     VALUES (@id, @card_id, @body, @created_at, @updated_at)`
  ).run(row)

  return toComment(row)
}

export function deleteComment(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM comments WHERE id = ?').run(id)
}
