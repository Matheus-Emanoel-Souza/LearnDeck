import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Attachment } from '@shared/types'

interface AttachmentRow {
  id: string
  card_id: string
  file_name: string
  stored_path: string
  mime_type: string | null
  size_bytes: number
  created_at: string
}

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    cardId: row.card_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at
  }
}

export function listAttachmentsByCard(db: Database.Database, cardId: string): Attachment[] {
  const rows = db
    .prepare('SELECT * FROM attachments WHERE card_id = ? ORDER BY created_at ASC')
    .all(cardId) as AttachmentRow[]
  return rows.map(toAttachment)
}

/** Linha completa (inclui stored_path) — só o main usa, pra abrir/apagar o arquivo no disco. */
export function getAttachmentRow(db: Database.Database, id: string): AttachmentRow | undefined {
  return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as AttachmentRow | undefined
}

export function insertAttachmentRow(
  db: Database.Database,
  input: { cardId: string; fileName: string; storedPath: string; mimeType: string | null; sizeBytes: number }
): Attachment {
  const row: AttachmentRow = {
    id: randomUUID(),
    card_id: input.cardId,
    file_name: input.fileName,
    stored_path: input.storedPath,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    created_at: new Date().toISOString()
  }

  db.prepare(
    `INSERT INTO attachments (id, card_id, file_name, stored_path, mime_type, size_bytes, created_at)
     VALUES (@id, @card_id, @file_name, @stored_path, @mime_type, @size_bytes, @created_at)`
  ).run(row)

  return toAttachment(row)
}

export function deleteAttachmentRow(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
}
