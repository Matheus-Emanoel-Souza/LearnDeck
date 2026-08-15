import type { ReactNode } from 'react'
import type { Card, CardStatus } from '@shared/types'
import { CARD_STATUS_LABELS } from '@shared/types'
import KanbanCard from './KanbanCard'

interface KanbanColumnProps {
  status: CardStatus
  cards: Card[]
  isDropTarget: boolean
  onDragStart: (cardId: string) => void
  onDragOverColumn: () => void
  onDropOnColumn: () => void
  onDragOverCard: (index: number) => void
  onDropOnCard: (index: number) => void
  headerExtra?: ReactNode
}

export default function KanbanColumn({
  status,
  cards,
  isDropTarget,
  onDragStart,
  onDragOverColumn,
  onDropOnColumn,
  onDragOverCard,
  onDropOnCard,
  headerExtra
}: KanbanColumnProps): JSX.Element {
  return (
    <div
      className={`kanban-column ${isDropTarget ? 'kanban-column--drop-target' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOverColumn()
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDropOnColumn()
      }}
    >
      <div className="kanban-column__header">
        <h3>{CARD_STATUS_LABELS[status]}</h3>
        <span className="kanban-column__count">{cards.length}</span>
      </div>

      <div className="kanban-column__cards">
        {cards.map((card, index) => (
          <KanbanCard
            key={card.id}
            card={card}
            index={index}
            onDragStart={onDragStart}
            onDragOverCard={onDragOverCard}
            onDropOnCard={onDropOnCard}
          />
        ))}
        {cards.length === 0 && <p className="empty-hint">Nenhum card aqui.</p>}
      </div>

      {headerExtra && <div className="kanban-column__footer">{headerExtra}</div>}
    </div>
  )
}
