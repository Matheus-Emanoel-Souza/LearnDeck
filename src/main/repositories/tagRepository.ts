import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Tag } from '@shared/types'

interface TagRow {
  id: string
  name: string
  color: string | null
}

function toTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, color: row.color }
}

export function listTagsForCard(db: Database.Database, cardId: string): Tag[] {
  const rows = db
    .prepare(
      `SELECT t.* FROM tags t
       JOIN card_tags ct ON ct.tag_id = t.id
       WHERE ct.card_id = ?
       ORDER BY t.name ASC`
    )
    .all(cardId) as TagRow[]
  return rows.map(toTag)
}

function findOrCreateTag(db: Database.Database, name: string): Tag {
  const normalized = name.trim()
  const existing = db.prepare('SELECT * FROM tags WHERE name = ?').get(normalized) as TagRow | undefined
  if (existing) return toTag(existing)

  const row: TagRow = { id: randomUUID(), name: normalized, color: null }
  db.prepare('INSERT INTO tags (id, name, color) VALUES (@id, @name, @color)').run(row)
  return toTag(row)
}

/** Cria (se preciso) e associa uma tag pelo nome — evita duplicar tags com o mesmo texto. */
export function attachTagToCard(db: Database.Database, cardId: string, tagName: string): Tag[] {
  if (!tagName.trim()) return listTagsForCard(db, cardId)

  const tag = findOrCreateTag(db, tagName)
  db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)').run(cardId, tag.id)

  return listTagsForCard(db, cardId)
}

export function detachTagFromCard(db: Database.Database, cardId: string, tagId: string): Tag[] {
  db.prepare('DELETE FROM card_tags WHERE card_id = ? AND tag_id = ?').run(cardId, tagId)
  return listTagsForCard(db, cardId)
}
