import type { CardStatus } from '@shared/types'
import { CARD_STATUS_LABELS } from '@shared/types'

export default function StatusBadge({ status }: { status: CardStatus }): JSX.Element {
  return <span className={`status-badge status-badge--${status}`}>{CARD_STATUS_LABELS[status]}</span>
}
