import type { StudySession } from '@shared/types'
import { formatDateTime, formatDurationLong } from '../lib/formatDate'

interface CardSessionsProps {
  sessions: StudySession[]
}

const SOURCE_LABELS: Record<StudySession['source'], string> = {
  manual: 'manual',
  pomodoro: 'Pomodoro'
}

/** Histórico de sessões de cronômetro/Pomodoro do card, mais recente primeiro. */
export default function CardSessions({ sessions }: CardSessionsProps): JSX.Element {
  const closed = sessions.filter((s) => s.endedAt)

  if (closed.length === 0) {
    return <p className="empty-hint">Nenhuma sessão registrada ainda.</p>
  }

  return (
    <ul className="session-list">
      {closed.map((session) => (
        <li key={session.id} className="session-item">
          <span>{formatDurationLong(session.durationSeconds ?? 0)}</span>
          <span className="session-item__meta">
            {SOURCE_LABELS[session.source]} · {formatDateTime(session.startedAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}
