import { ipcMain, app } from 'electron'
import type Database from 'better-sqlite3'
import { ensureDefaultWorkspace } from '../repositories/workspaceRepository'
import type { Workspace } from '@shared/types'

export interface AppInfo {
  version: string
  workspace: Workspace
}

/**
 * Handlers de propósito geral. Serve, nesta fase inicial, para validar a cadeia
 * completa renderer -> preload -> ipcMain -> SQLite -> volta pro renderer.
 */
export function registerAppIpc(db: Database.Database): void {
  ipcMain.handle('app:getInfo', (): AppInfo => {
    const workspace = ensureDefaultWorkspace(db)
    return { version: app.getVersion(), workspace }
  })
}
