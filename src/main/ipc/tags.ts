import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Tag } from '@shared/types'
import { attachTagToCard, detachTagFromCard, listTagsForCard } from '../repositories/tagRepository'

export function registerTagsIpc(db: Database.Database): void {
  ipcMain.handle('tags:listForCard', (_event, cardId: string): Tag[] => listTagsForCard(db, cardId))

  ipcMain.handle('tags:attachToCard', (_event, cardId: string, tagName: string): Tag[] =>
    attachTagToCard(db, cardId, tagName)
  )

  ipcMain.handle('tags:detachFromCard', (_event, cardId: string, tagId: string): Tag[] =>
    detachTagFromCard(db, cardId, tagId)
  )
}
