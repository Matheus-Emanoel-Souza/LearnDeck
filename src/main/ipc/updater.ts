import { ipcMain } from 'electron'
import type { UpdateStatus } from '@shared/types'
import { checkForUpdatesManually, downloadUpdateNow, getUpdaterStatus, installUpdateNow } from '../updater'

export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:getStatus', (): UpdateStatus => getUpdaterStatus())
  ipcMain.handle('updater:check', (): Promise<void> => checkForUpdatesManually())
  ipcMain.handle('updater:download', (): Promise<void> => downloadUpdateNow())
  ipcMain.handle('updater:install', (): void => installUpdateNow())
}
