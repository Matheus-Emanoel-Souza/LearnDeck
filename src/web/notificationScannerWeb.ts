/**
 * Equivalente web de `src/main/notificationScanner.ts`. Sem `BrowserWindow`
 * pra fazer broadcast entre janelas (é uma aba só) — quem quiser saber que
 * uma notificação nova entrou assina `onNotificationsChanged` (ver api.ts,
 * usado pelo `notifications.onChanged` exposto em `window.api`).
 */
import type Database from 'better-sqlite3'
import { scanForOverdue } from '../main/services/notificationService'

const target = new EventTarget()
const CHANGED = 'changed'

export function scanAndBroadcast(db: Database.Database, workspaceId: string): void {
  const createdAny = scanForOverdue(db, workspaceId)
  if (createdAny) target.dispatchEvent(new Event(CHANGED))
}

export function onNotificationsChanged(callback: () => void): () => void {
  target.addEventListener(CHANGED, callback)
  return () => target.removeEventListener(CHANGED, callback)
}
