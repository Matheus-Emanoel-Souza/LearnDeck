import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { CalendarItem } from '@shared/types'
import { getCalendarItems } from '../services/calendarService'

export function registerCalendarIpc(db: Database.Database): void {
  ipcMain.handle('calendar:getItems', (_event, workspaceId: string): CalendarItem[] =>
    getCalendarItems(db, workspaceId)
  )
}
