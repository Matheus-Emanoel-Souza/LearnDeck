import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Notebook, NotebookVersion, SaveNotebookInput, SaveNotebookResult } from '@shared/types'
import {
  getOrCreateNotebook,
  listNotebookVersions,
  restoreNotebookVersion,
  saveNotebook
} from '../services/notebookService'

export function registerNotebooksIpc(db: Database.Database): void {
  ipcMain.handle('notebooks:getByCard', (_event, cardId: string): Notebook =>
    getOrCreateNotebook(db, cardId)
  )

  ipcMain.handle('notebooks:save', (_event, input: SaveNotebookInput): SaveNotebookResult =>
    saveNotebook(db, input.cardId, input.contentMarkdown, input.baseVersion)
  )

  ipcMain.handle('notebooks:listVersions', (_event, cardId: string): NotebookVersion[] =>
    listNotebookVersions(db, cardId)
  )

  ipcMain.handle(
    'notebooks:restoreVersion',
    (_event, cardId: string, version: number, baseVersion: number): SaveNotebookResult =>
      restoreNotebookVersion(db, cardId, version, baseVersion)
  )
}
