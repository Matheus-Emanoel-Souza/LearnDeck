import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Card, CreateCardInput, UpdateCardInput } from '@shared/types'
import { createCard, deleteCard, listCards, updateCard } from '../services/cardService'

export function registerCardsIpc(db: Database.Database): void {
  ipcMain.handle('cards:listByGroup', (_event, groupId: string): Card[] => listCards(db, groupId))

  ipcMain.handle('cards:create', (_event, input: CreateCardInput): Card => createCard(db, input))

  ipcMain.handle(
    'cards:update',
    (_event, id: string, patch: UpdateCardInput): Card => updateCard(db, id, patch)
  )

  ipcMain.handle('cards:delete', (_event, id: string): void => deleteCard(db, id))
}
