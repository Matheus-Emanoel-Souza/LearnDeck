import type { Card, CardStatus } from '@shared/types'
import { CARD_STATUSES } from '@shared/types'

export interface CardPositionUpdate {
  id: string
  status: CardStatus
  position: number
}

/**
 * Recalcula status/position ao mover um card no Kanban (drag-and-drop ou clique).
 * Retorna apenas as linhas que precisam ser persistidas via `window.api.cards.update`
 * (o card movido + os cards da(s) coluna(s) afetada(s) que mudaram de posição).
 *
 * `targetIndex === null` insere no fim da coluna de destino.
 */
export function reorderCards(
  cards: Card[],
  movedCardId: string,
  targetStatus: CardStatus,
  targetIndex: number | null
): CardPositionUpdate[] {
  const moved = cards.find((c) => c.id === movedCardId)
  if (!moved) return []

  const sourceStatus = moved.status

  const byStatus = new Map<CardStatus, Card[]>(CARD_STATUSES.map((s) => [s, []]))
  for (const card of cards) {
    if (card.id === movedCardId) continue
    byStatus.get(card.status)!.push(card)
  }
  for (const list of byStatus.values()) {
    list.sort((a, b) => a.position - b.position)
  }

  const targetList = byStatus.get(targetStatus)!
  const insertAt =
    targetIndex === null ? targetList.length : Math.max(0, Math.min(targetIndex, targetList.length))
  targetList.splice(insertAt, 0, moved)

  const updates: CardPositionUpdate[] = []

  targetList.forEach((card, index) => {
    updates.push({ id: card.id, status: targetStatus, position: index })
  })

  if (sourceStatus !== targetStatus) {
    byStatus.get(sourceStatus)!.forEach((card, index) => {
      updates.push({ id: card.id, status: sourceStatus, position: index })
    })
  }

  return updates
}

export function groupCardsByStatus(cards: Card[]): Map<CardStatus, Card[]> {
  const byStatus = new Map<CardStatus, Card[]>(CARD_STATUSES.map((s) => [s, []]))
  for (const card of cards) {
    byStatus.get(card.status)!.push(card)
  }
  for (const list of byStatus.values()) {
    list.sort((a, b) => a.position - b.position)
  }
  return byStatus
}
