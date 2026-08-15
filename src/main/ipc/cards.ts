import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Card, CardSummary, CreateCardInput, UpdateCardInput } from '@shared/types'
import { getCard, searchCardsInWorkspace } from '../repositories/cardRepository'
import { createCard, deleteCard, listCards, updateCard } from '../services/cardService'

export function registerCardsIpc(db: Database.Database): void {
  ipcMain.handle('cards:listByGroup', (_event, groupId: string): Card[] => listCards(db, groupId))

  ipcMain.handle('cards:get', (_event, id: string): Card | undefined => getCard(db, id))

  ipcMain.handle('cards:create', (_event, input: CreateCardInput): Card => createCard(db, input))

  ipcMain.handle(
    'cards:update',
    (_event, id: string, patch: UpdateCardInput): Card => updateCard(db, id, patch)
  )

  ipcMain.handle('cards:delete', (_event, id: string): void => deleteCard(db, id))

  ipcMain.handle(
    'cards:search',
    (_event, workspaceId: string, query: string, excludeCardId: string): CardSummary[] =>
      query.trim().length < 2 ? [] : searchCardsInWorkspace(db, workspaceId, query.trim(), excludeCardId)
  )
}
