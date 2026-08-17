import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { BoardColumn, CreateBoardColumnInput, UpdateBoardColumnInput } from '@shared/types'
import {
  createColumn,
  deleteColumn,
  duplicateColumn,
  listColumns,
  moveColumn,
  reorderColumns,
  updateColumn
} from '../services/boardColumnService'

export function registerBoardColumnsIpc(db: Database.Database): void {
  ipcMain.handle('boardColumns:list', (_event, workspaceId: string): BoardColumn[] =>
    listColumns(db, workspaceId)
  )

  ipcMain.handle('boardColumns:create', (_event, input: CreateBoardColumnInput): BoardColumn =>
    createColumn(db, input)
  )

  ipcMain.handle(
    'boardColumns:update',
    (_event, id: string, patch: UpdateBoardColumnInput): BoardColumn => updateColumn(db, id, patch)
  )

  ipcMain.handle(
    'boardColumns:move',
    (_event, id: string, direction: 'left' | 'right'): BoardColumn[] => moveColumn(db, id, direction)
  )

  ipcMain.handle('boardColumns:delete', (_event, id: string): void => deleteColumn(db, id))

  ipcMain.handle(
    'boardColumns:reorder',
    (_event, workspaceId: string, orderedIds: string[]): BoardColumn[] =>
      reorderColumns(db, workspaceId, orderedIds)
  )

  ipcMain.handle('boardColumns:duplicate', (_event, id: string): BoardColumn => duplicateColumn(db, id))
}
