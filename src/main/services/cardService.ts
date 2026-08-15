import type Database from 'better-sqlite3'
import type { Card, CreateCardInput, UpdateCardInput } from '@shared/types'
import {
  getCard,
  insertCardRow,
  insertStatusHistory,
  listCardsByGroup,
  softDeleteCard,
  updateCardRow
} from '../repositories/cardRepository'

/**
 * Regra de negócio: criar um card grava a linha inicial do histórico
 * (from_status = NULL -> to_status = 'backlog'); mudar o status de um card
 * grava uma nova linha de histórico — sempre dentro da mesma transação que a
 * própria mudança, para nunca ficar um card sem o rastro correspondente.
 */
export function createCard(db: Database.Database, input: CreateCardInput): Card {
  if (!input.title.trim()) throw new Error('Título do card é obrigatório')

  const run = db.transaction(() => {
    const card = insertCardRow(db, input)
    insertStatusHistory(db, card.id, null, card.status)
    return card
  })

  return run()
}

export function updateCard(db: Database.Database, id: string, patch: UpdateCardInput): Card {
  const run = db.transaction(() => {
    const before = getCard(db, id)
    if (!before) throw new Error(`Card não encontrado: ${id}`)

    const after = updateCardRow(db, id, patch)

    if (patch.status && patch.status !== before.status) {
      insertStatusHistory(db, id, before.status, patch.status)
    }

    return after
  })

  return run()
}

export function listCards(db: Database.Database, groupId: string): Card[] {
  return listCardsByGroup(db, groupId)
}

export function deleteCard(db: Database.Database, id: string): void {
  softDeleteCard(db, id)
}
