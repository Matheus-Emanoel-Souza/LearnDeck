import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { DashboardSummary } from '@shared/types'
import { getDashboardSummary } from '../services/dashboardService'

export function registerDashboardIpc(db: Database.Database): void {
  ipcMain.handle('dashboard:getSummary', (_event, workspaceId: string): DashboardSummary =>
    getDashboardSummary(db, workspaceId)
  )
}
