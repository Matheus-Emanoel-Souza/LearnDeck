import { useEffect, useState } from 'react'
import type { BoardColumn, Card } from '@shared/types'
import { formatDueDate, getDueStatus } from '../lib/dueStatus'
import StatusBadge from './StatusBadge'
import CardIdBadge from './CardIdBadge'
import CardActionsMenu, { type CardActionId } from './CardActionsMenu'

interface KanbanCardProps {
  card: Card
  column: BoardColumn | undefined
  onDragStart: (cardId: string) => void
  onDragOverCard: (index: number) => void
  onDropOnCard: (index: number) => void
  onOpen: (card: Card) => void
  onAction: (card: Card, action: CardActionId) => void
  index: number
}

export default function KanbanCard({
  card,
  column,
  onDragStart,
  onDragOverCard,
  onDropOnCard,
  onOpen,
  onAction,
  index
}: KanbanCardProps): JSX.Element {
  // Enquanto o menu de ações está sendo usado, o card não pode ser
  // "draggable" — senão o navegador começa o drag nativo ao pressionar o
  // botão de três pontos, e o menu nunca chega a abrir.
  const [dragDisabled, setDragDisabled] = useState(false)

  useEffect(() => {
    if (!dragDisabled) return
    function reset(): void {
      setDragDisabled(false)
    }
    document.addEventListener('mouseup', reset, { once: true })
    return () => document.removeEventListener('mouseup', reset)
  }, [dragDisabled])

  return (
    <div
      className="kanban-card"
      draggable={!dragDisabled}
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
        <div className="kanban-card__header-actions">
          <StatusBadge name={column?.name ?? '—'} isDone={column?.isDone} />
          <div onMouseDown={() => setDragDisabled(true)}>
            <CardActionsMenu onAction={(action) => onAction(card, action)} />
          </div>
        </div>
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
