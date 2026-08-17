import type { BoardColumn, Card } from '@shared/types'

export interface CardPositionUpdate {
  id: string
  columnId: string
  position: number
}

/**
 * Recalcula coluna/position ao mover um card no Kanban (drag-and-drop ou clique).
 * Retorna apenas as linhas que precisam ser persistidas via `window.api.cards.update`
 * (o card movido + os cards da(s) coluna(s) afetada(s) que mudaram de posição).
 *
 * `targetIndex === null` insere no fim da coluna de destino.
 */
export function reorderCards(
  cards: Card[],
  columns: BoardColumn[],
  movedCardId: string,
  targetColumnId: string,
  targetIndex: number | null
): CardPositionUpdate[] {
  const moved = cards.find((c) => c.id === movedCardId)
  if (!moved) return []

  const sourceColumnId = moved.columnId

  const byColumn = new Map<string, Card[]>(columns.map((c) => [c.id, []]))
  for (const card of cards) {
    if (card.id === movedCardId) continue
    byColumn.get(card.columnId)?.push(card)
  }
  for (const list of byColumn.values()) {
    list.sort((a, b) => a.position - b.position)
  }

  const targetList = byColumn.get(targetColumnId)
  if (!targetList) return []
  const insertAt =
    targetIndex === null ? targetList.length : Math.max(0, Math.min(targetIndex, targetList.length))
  targetList.splice(insertAt, 0, moved)

  const updates: CardPositionUpdate[] = []

  targetList.forEach((card, index) => {
    updates.push({ id: card.id, columnId: targetColumnId, position: index })
  })

  if (sourceColumnId !== targetColumnId) {
    byColumn.get(sourceColumnId)?.forEach((card, index) => {
      updates.push({ id: card.id, columnId: sourceColumnId, position: index })
    })
  }

  return updates
}

export function groupCardsByColumn(cards: Card[], columns: BoardColumn[]): Map<string, Card[]> {
  const byColumn = new Map<string, Card[]>(columns.map((c) => [c.id, []]))
  for (const card of cards) {
    byColumn.get(card.columnId)?.push(card)
  }
  for (const list of byColumn.values()) {
    list.sort((a, b) => a.position - b.position)
  }
  return byColumn
}
