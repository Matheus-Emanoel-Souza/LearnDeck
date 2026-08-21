import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Card, CardSummary, CreateCardInput, UpdateCardInput } from '@shared/types'
import {
  getCard,
  getWorkspaceIdForCard,
  listAllCardSummariesInWorkspace,
  searchCardsInWorkspace
} from '../repositories/cardRepository'
import { createCard, deleteCard, findCardByIdQuery, listCards, updateCard } from '../services/cardService'
import { scanAndBroadcast } from '../notificationScanner'

export function registerCardsIpc(db: Database.Database): void {
  ipcMain.handle('cards:listByGroup', (_event, groupId: string): Card[] => listCards(db, groupId))

  ipcMain.handle('cards:get', (_event, id: string): Card | undefined => getCard(db, id))

  ipcMain.handle('cards:create', (_event, input: CreateCardInput): Card => {
    const card = createCard(db, input)
    if (card.dueDate) scanAndBroadcast(db, getWorkspaceIdForCard(db, card.id) ?? '')
    return card
  })

  ipcMain.handle('cards:update', (_event, id: string, patch: UpdateCardInput): Card => {
    const card = updateCard(db, id, patch)
    if (patch.dueDate !== undefined || patch.columnId !== undefined) {
      scanAndBroadcast(db, getWorkspaceIdForCard(db, card.id) ?? '')
    }
    return card
  })

  ipcMain.handle('cards:delete', (_event, id: string): void => deleteCard(db, id))

  ipcMain.handle(
    'cards:search',
    (_event, workspaceId: string, query: string, excludeCardId: string): CardSummary[] =>
      query.trim().length < 2 ? [] : searchCardsInWorkspace(db, workspaceId, query.trim(), excludeCardId)
  )

  ipcMain.handle(
    'cards:listAllSummaries',
    (_event, workspaceId: string, excludeCardId: string): CardSummary[] =>
      listAllCardSummariesInWorkspace(db, workspaceId, excludeCardId)
  )

  ipcMain.handle(
    'cards:findByIdQuery',
    (_event, workspaceId: string, idQuery: string): Card | undefined =>
      findCardByIdQuery(db, workspaceId, idQuery)
  )
}
