import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { CardRelation, CardRelationView, CreateCardRelationInput } from '@shared/types'
import {
  createRelation,
  deleteRelation,
  listRelationsForCard
} from '../repositories/cardRelationRepository'

export function registerRelationsIpc(db: Database.Database): void {
  ipcMain.handle('relations:listByCard', (_event, cardId: string): CardRelationView[] =>
    listRelationsForCard(db, cardId)
  )

  ipcMain.handle('relations:create', (_event, input: CreateCardRelationInput): CardRelation =>
    createRelation(db, input)
  )

  ipcMain.handle('relations:delete', (_event, id: string): void => deleteRelation(db, id))
}
