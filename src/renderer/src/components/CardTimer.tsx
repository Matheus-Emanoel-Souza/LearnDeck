import { useEffect, useState } from 'react'
import type { Card, StudySession } from '@shared/types'
import { formatClock, formatDurationLong } from '../lib/formatDate'

interface CardTimerProps {
  card: Card
  onCardUpdated: (card: Card) => void
  onSessionsChanged: () => void
}

/**
 * Cronômetro manual do card: só existe uma sessão aberta por vez (regra do
 * TimerService). O tempo total exibido vem de card.totalStudySeconds
 * (desnormalizado, recalculado no backend a cada sessão fechada).
 */
export default function CardTimer({ card, onCardUpdated, onSessionsChanged }: CardTimerProps): JSX.Element {
  const [running, setRunning] = useState<StudySession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.timer
      .getRunning(card.id)
      .then((session) => setRunning(session ?? null))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
    // Só ao trocar de card — cada card tem sua própria sessão em aberto (ou não).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  useEffect(() => {
    if (!running) {
      setElapsed(0)
      return
    }
    const tick = (): void => setElapsed((Date.now() - new Date(running.startedAt).getTime()) / 1000)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [running])

  async function handleStart(): Promise<void> {
    setBusy(true)
    try {
      setRunning(await window.api.timer.start(card.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleStop(): Promise<void> {
    setBusy(true)
    try {
      const { card: updated } = await window.api.timer.stop(card.id)
      setRunning(null)
      onCardUpdated(updated)
      onSessionsChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="timer-widget">
      <div className="timer-widget__display">{running ? formatClock(elapsed) : formatDurationLong(card.totalStudySeconds)}</div>
      <p className="empty-hint">
        {running ? 'Cronômetro rodando…' : `Total estudado: ${formatDurationLong(card.totalStudySeconds)}`}
      </p>
      {error && <p className="status status--error">{error}</p>}
      <div className="timer-widget__actions">
        {!running ? (
          <button className="primary-button" disabled={busy} onClick={handleStart}>
            ▶ Iniciar estudo
          </button>
        ) : (
          <button className="secondary-button" disabled={busy} onClick={handleStop}>
            ■ Parar
          </button>
        )}
      </div>
    </div>
  )
}
