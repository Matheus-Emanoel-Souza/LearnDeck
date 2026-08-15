import type { Card } from '@shared/types'
import StatusBadge from './StatusBadge'

interface KanbanCardProps {
  card: Card
  onDragStart: (cardId: string) => void
  onDragOverCard: (index: number) => void
  onDropOnCard: (index: number) => void
  onOpen: (card: Card) => void
  index: number
}

export default function KanbanCard({
  card,
  onDragStart,
  onDragOverCard,
  onDropOnCard,
  onOpen,
  index
}: KanbanCardProps): JSX.Element {
  return (
    <div
      className="kanban-card"
      draggable
      onClick={() => onOpen(card)}
      onDragStart={() => onDragStart(card.id)}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDragOverCard(index)
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDropOnCard(index)
      }}
    >
      <div className="kanban-card__header">
        <h4>{card.title}</h4>
        <StatusBadge status={card.status} />
      </div>

      {card.description && <p className="kanban-card__description">{card.description}</p>}

      <div className="kanban-card__footer">
        <span>
          {card.totalStudySeconds > 0 ? `${Math.floor(card.totalStudySeconds / 60)} min` : 'sem estudo'}
        </span>
        <span>
          {card.pomodorosCompleted} pomodoro{card.pomodorosCompleted === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}
