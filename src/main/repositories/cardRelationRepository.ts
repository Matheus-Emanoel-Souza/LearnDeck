import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type {
  CardRelation,
  CardRelationType,
  CardRelationView,
  CardStatus,
  CreateCardRelationInput
} from '@shared/types'

interface CardRelationRow {
  id: string
  card_id: string
  related_card_id: string
  relation_type: CardRelationType
  created_at: string
}

function toRelation(row: CardRelationRow): CardRelation {
  return {
    id: row.id,
    cardId: row.card_id,
    relatedCardId: row.related_card_id,
    relationType: row.relation_type,
    createdAt: row.created_at
  }
}

/**
 * Relações são direcionadas (card_id -> related_card_id), mas na tela do card
 * mostramos as duas pontas: as que este card criou (outgoing) e as que outros
 * cards criaram apontando pra ele (incoming) — ver docs/database.md.
 */
export function listRelationsForCard(db: Database.Database, cardId: string): CardRelationView[] {
  const outgoing = db
    .prepare(
      `SELECT r.id, r.relation_type, r.created_at, c.id AS card_id, c.group_id, c.title, c.status
       FROM card_relations r
       JOIN cards c ON c.id = r.related_card_id
       WHERE r.card_id = ?`
    )
    .all(cardId) as Array<{
    id: string
    relation_type: CardRelationType
    created_at: string
    card_id: string
    group_id: string
    title: string
    status: CardStatus
  }>

  const incoming = db
    .prepare(
      `SELECT r.id, r.relation_type, r.created_at, c.id AS card_id, c.group_id, c.title, c.status
       FROM card_relations r
       JOIN cards c ON c.id = r.card_id
       WHERE r.related_card_id = ?`
    )
    .all(cardId) as Array<{
    id: string
    relation_type: CardRelationType
    created_at: string
    card_id: string
    group_id: string
    title: string
    status: CardStatus
  }>

  const toView = (
    row: (typeof outgoing)[number],
    direction: 'outgoing' | 'incoming'
  ): CardRelationView => ({
    id: row.id,
    relationType: row.relation_type,
    direction,
    createdAt: row.created_at,
    card: { id: row.card_id, groupId: row.group_id, title: row.title, status: row.status }
  })

  return [
    ...outgoing.map((row) => toView(row, 'outgoing')),
    ...incoming.map((row) => toView(row, 'incoming'))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createRelation(db: Database.Database, input: CreateCardRelationInput): CardRelation {
  if (input.cardId === input.relatedCardId) {
    throw new Error('Um card não pode se relacionar consigo mesmo')
  }

  const row: CardRelationRow = {
    id: randomUUID(),
    card_id: input.cardId,
    related_card_id: input.relatedCardId,
    relation_type: input.relationType,
    created_at: new Date().toISOString()
  }

  db.prepare(
    `INSERT OR IGNORE INTO card_relations (id, card_id, related_card_id, relation_type, created_at)
     VALUES (@id, @card_id, @related_card_id, @relation_type, @created_at)`
  ).run(row)

  const existing = db
    .prepare(
      'SELECT * FROM card_relations WHERE card_id = ? AND related_card_id = ? AND relation_type = ?'
    )
    .get(input.cardId, input.relatedCardId, input.relationType) as CardRelationRow

  return toRelation(existing)
}

export function deleteRelation(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM card_relations WHERE id = ?').run(id)
}
