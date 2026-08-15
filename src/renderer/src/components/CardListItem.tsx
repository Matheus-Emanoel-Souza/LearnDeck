import type { Card, CardStatus } from '@shared/types'
import { CARD_STATUSES, CARD_STATUS_LABELS } from '@shared/types'
import StatusBadge from './StatusBadge'

interface CardListItemProps {
  card: Card
  onChangeStatus: (cardId: string, status: CardStatus) => void
}

export default function CardListItem({ card, onChangeStatus }: CardListItemProps): JSX.Element {
  return (
    <div className="card-item">
      <div className="card-item__header">
        <h3>{card.title}</h3>
        <StatusBadge status={card.status} />
      </div>

      {card.description && <p className="card-item__description">{card.description}</p>}

      <div className="card-item__footer">
        <label className="card-item__status-select">
          Status:
          <select value={card.status} onChange={(e) => onChangeStatus(card.id, e.target.value as CardStatus)}>
            {CARD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CARD_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <span className="card-item__meta">
          {card.totalStudySeconds > 0
            ? `${Math.floor(card.totalStudySeconds / 60)} min estudados`
            : 'Ainda não estudado'}
          {' · '}
          {card.pomodorosCompleted} pomodoro{card.pomodorosCompleted === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}
