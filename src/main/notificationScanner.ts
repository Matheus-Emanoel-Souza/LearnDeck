import { BrowserWindow } from 'electron'
import type Database from 'better-sqlite3'
import { scanForOverdue } from './services/notificationService'

/**
 * Roda o scan de atraso e, se alguma notificação nova entrou, avisa todas as
 * janelas (renderer atualiza badge/lista sem precisar dar F5). Chamado tanto
 * pelo timer periódico (src/main/index.ts) quanto logo após qualquer
 * mutação que envolva prazo (criar/editar card ou subtarefa — ver ipc/cards.ts
 * e ipc/subtasks.ts), pra refletir na hora em vez de esperar até 60s.
 */
export function scanAndBroadcast(db: Database.Database, workspaceId: string): void {
  const createdAny = scanForOverdue(db, workspaceId)
  if (!createdAny) return

  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('notifications:changed')
  }
}
