import { useState } from 'react'
import type { Card, CardStatus } from '@shared/types'
import { CARD_STATUSES } from '@shared/types'
import { groupCardsByStatus } from '../lib/kanban'
import KanbanColumn from './KanbanColumn'
import NewCardForm from './NewCardForm'

interface KanbanBoardProps {
  cards: Card[]
  onMoveCard: (cardId: string, targetStatus: CardStatus, targetIndex: number | null) => Promise<void>
  onCreateCard: (title: string, description: string | null) => Promise<void>
  onOpenCard: (card: Card) => void
}

/**
 * Quadro Kanban: colunas fixas por status, cards arrastáveis entre e dentro
 * de colunas (drag-and-drop nativo, sem dependência extra). Novos cards
 * sempre entram em "Backlog" (regra do CardService), por isso o formulário
 * de criação fica só nessa coluna.
 */
export default function KanbanBoard({
  cards,
  onMoveCard,
  onCreateCard,
  onOpenCard
}: KanbanBoardProps): JSX.Element {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<CardStatus | null>(null)

  const byStatus = groupCardsByStatus(cards)

  async function finishDrop(targetStatus: CardStatus, targetIndex: number | null): Promise<void> {
    const cardId = draggedCardId
    setDraggedCardId(null)
    setDropTargetStatus(null)
    if (!cardId) return
    await onMoveCard(cardId, targetStatus, targetIndex)
  }

  return (
    <div className="kanban-board">
      {CARD_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          cards={byStatus.get(status) ?? []}
          isDropTarget={dropTargetStatus === status}
          onDragStart={setDraggedCardId}
          onDragOverColumn={() => setDropTargetStatus(status)}
          onDropOnColumn={() => void finishDrop(status, null)}
          onDragOverCard={() => setDropTargetStatus(status)}
          onDropOnCard={(index) => void finishDrop(status, index)}
          onOpenCard={onOpenCard}
          headerExtra={status === 'backlog' ? <NewCardForm onCreate={onCreateCard} /> : undefined}
        />
      ))}
    </div>
  )
}
