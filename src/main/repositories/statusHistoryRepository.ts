import type Database from 'better-sqlite3'
import type { StatusHistoryEntry } from '@shared/types'

interface StatusHistoryRow {
  id: string
  card_id: string
  from_status: string | null
  to_status: string
  changed_at: string
}

function toEntry(row: StatusHistoryRow): StatusHistoryEntry {
  return {
    id: row.id,
    cardId: row.card_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: row.changed_at
  }
}

export function listStatusHistoryByCard(db: Database.Database, cardId: string): StatusHistoryEntry[] {
  const rows = db
    .prepare('SELECT * FROM status_history WHERE card_id = ? ORDER BY changed_at DESC')
    .all(cardId) as StatusHistoryRow[]
  return rows.map(toEntry)
}
