import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { BackupFile, BackupImportSummary } from '@shared/types'
import { exportBackup, importBackup } from '../services/backupService'

export function registerBackupIpc(db: Database.Database): void {
  ipcMain.handle('backup:export', (_event, workspaceId: string): BackupFile => exportBackup(db, workspaceId))

  ipcMain.handle(
    'backup:import',
    (_event, workspaceId: string, payload: unknown): BackupImportSummary =>
      importBackup(db, workspaceId, payload)
  )
}
