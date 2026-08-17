import type { BoardColumn, Card } from '@shared/types'
import { formatDueDate, getDueStatus } from '../lib/dueStatus'
import StatusBadge from './StatusBadge'
import CardIdBadge from './CardIdBadge'

interface KanbanCardProps {
  card: Card
  column: BoardColumn | undefined
  onDragStart: (cardId: string) => void
  onDragOverCard: (index: number) => void
  onDropOnCard: (index: number) => void
  onOpen: (card: Card) => void
  index: number
}

export default function KanbanCard({
  card,
  column,
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
        <div className="kanban-card__title-group">
          <h4>{card.title}</h4>
          <CardIdBadge id={card.id} />
        </div>
        <StatusBadge name={column?.name ?? '—'} isDone={column?.isDone} />
      </div>

      {card.description && <p className="kanban-card__description">{card.description}</p>}

      {card.dueDate && (
        <span className={`due-badge due-badge--${getDueStatus(card.dueDate, card.dueTime, column?.isDone ?? false)}`}>
          {formatDueDate(card.dueDate, card.dueTime)}
        </span>
      )}

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
