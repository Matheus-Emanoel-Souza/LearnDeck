import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { AppNotification } from '@shared/types'
import { getNotifications, getUnreadCount, readAllNotifications, readNotification } from '../services/notificationService'
import { scanAndBroadcast } from '../notificationScanner'

export function registerNotificationsIpc(db: Database.Database): void {
  ipcMain.handle('notifications:list', (_event, workspaceId: string): AppNotification[] =>
    getNotifications(db, workspaceId)
  )

  ipcMain.handle('notifications:countUnread', (_event, workspaceId: string): number =>
    getUnreadCount(db, workspaceId)
  )

  ipcMain.handle('notifications:markRead', (_event, id: string): void => readNotification(db, id))

  ipcMain.handle('notifications:markAllRead', (_event, workspaceId: string): void =>
    readAllNotifications(db, workspaceId)
  )

  // Chamado quando a tela de Notificações/Calendário abre, pra garantir que
  // o scan periódico não deixou nada de fora (sem esperar até 60s).
  ipcMain.handle('notifications:scanNow', (_event, workspaceId: string): void =>
    scanAndBroadcast(db, workspaceId)
  )
}
