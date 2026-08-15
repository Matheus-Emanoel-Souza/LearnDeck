import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { StatusHistoryEntry } from '@shared/types'
import { listStatusHistoryByCard } from '../repositories/statusHistoryRepository'

export function registerHistoryIpc(db: Database.Database): void {
  ipcMain.handle('history:listByCard', (_event, cardId: string): StatusHistoryEntry[] =>
    listStatusHistoryByCard(db, cardId)
  )
}
