import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { AppNotification, NotificationKind } from '@shared/types'

interface NotificationRow {
  id: string
  workspace_id: string
  kind: NotificationKind
  card_id: string
  subtask_id: string | null
  message: string
  due_at: string
  is_read: number
  created_at: string
}

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    cardId: row.card_id,
    subtaskId: row.subtask_id,
    message: row.message,
    dueAt: row.due_at,
    isRead: row.is_read === 1,
    createdAt: row.created_at
  }
}

export function listNotifications(db: Database.Database, workspaceId: string): AppNotification[] {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE workspace_id = ? ORDER BY created_at DESC')
    .all(workspaceId) as NotificationRow[]
  return rows.map(toNotification)
}

export function countUnreadNotifications(db: Database.Database, workspaceId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM notifications WHERE workspace_id = ? AND is_read = 0')
    .get(workspaceId) as { n: number }
  return row.n
}

/** INSERT OR IGNORE contra o índice único (kind, card_id, subtask_id, due_at)
 * — reescanear o mesmo vencimento nunca gera uma segunda notificação. Retorna
 * true só quando de fato inseriu (pra saber se deve avisar o renderer). */
export function insertNotificationIfAbsent(
  db: Database.Database,
  input: {
    workspaceId: string
    kind: NotificationKind
    cardId: string
    subtaskId: string | null
    message: string
    dueAt: string
  }
): boolean {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO notifications
         (id, workspace_id, kind, card_id, subtask_id, message, due_at, is_read, created_at)
       VALUES (@id, @workspace_id, @kind, @card_id, @subtask_id, @message, @due_at, 0, @created_at)`
    )
    .run({
      id: randomUUID(),
      workspace_id: input.workspaceId,
      kind: input.kind,
      card_id: input.cardId,
      subtask_id: input.subtaskId,
      message: input.message,
      due_at: input.dueAt,
      created_at: new Date().toISOString()
    })

  return result.changes > 0
}

export function markNotificationRead(db: Database.Database, id: string): void {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id)
}

export function markAllNotificationsRead(db: Database.Database, workspaceId: string): void {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE workspace_id = ? AND is_read = 0').run(workspaceId)
}
