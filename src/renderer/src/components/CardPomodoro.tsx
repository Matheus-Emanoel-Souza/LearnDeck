import { useEffect, useRef, useState } from 'react'
import type { Card, Pomodoro, PomodoroConfig, PomodoroKind } from '@shared/types'
import { formatClock } from '../lib/formatDate'

interface CardPomodoroProps {
  card: Card
  onCardUpdated: (card: Card) => void
  onSessionsChanged: () => void
}

const PHASE_LABELS: Record<PomodoroKind, string> = {
  focus: 'Foco',
  short_break: 'Pausa curta',
  long_break: 'Pausa longa'
}

function minutesFor(kind: PomodoroKind, config: PomodoroConfig): number {
  if (kind === 'focus') return config.focusMinutes
  if (kind === 'short_break') return config.shortBreakMinutes
  return config.longBreakMinutes
}

/**
 * Pomodoro configurável por card (config global editável na v1, ver
 * docs/database.md). Um ciclo de foco em andamento carrega junto uma
 * study_session — por isso, ao concluir ou cancelar, avisamos o pai para
 * recarregar card (totais) e lista de sessões.
 */
export default function CardPomodoro({ card, onCardUpdated, onSessionsChanged }: CardPomodoroProps): JSX.Element {
  const [config, setConfig] = useState<PomodoroConfig | null>(null)
  const [cycle, setCycle] = useState<Pomodoro | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [focusCyclesDone, setFocusCyclesDone] = useState(0)
  const [suggested, setSuggested] = useState<PomodoroKind>('focus')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingConfig, setEditingConfig] = useState(false)
  const finishing = useRef(false)

  useEffect(() => {
    finishing.current = false
    setFocusCyclesDone(0)
    setSuggested('focus')
    Promise.all([window.api.pomodoro.getConfig(card.id), window.api.pomodoro.getOpenCycle(card.id)])
      .then(([cfg, open]) => {
        setConfig(cfg)
        setCycle(open ?? null)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  useEffect(() => {
    if (!cycle || !config) return

    const totalSeconds = minutesFor(cycle.kind, config) * 60
    const tick = (): void => {
      const left = totalSeconds - (Date.now() - new Date(cycle.startedAt).getTime()) / 1000
      setSecondsLeft(Math.max(0, left))
      if (left <= 0 && !finishing.current) {
        finishing.current = true
        void finishAutomatically(cycle)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, config])

  async function finishAutomatically(current: Pomodoro): Promise<void> {
    try {
      await window.api.pomodoro.finishCycle(card.id, current.id, true)
      await afterCycleEnds(current.kind, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function afterCycleEnds(kind: PomodoroKind, completed: boolean): Promise<void> {
    setCycle(null)
    const updatedCard = await window.api.cards.get(card.id)
    if (updatedCard) onCardUpdated(updatedCard)
    onSessionsChanged()

    if (kind === 'focus') {
      const done = completed ? focusCyclesDone + 1 : focusCyclesDone
      setFocusCyclesDone(done)
      setSuggested(config && done % config.cyclesBeforeLongBreak === 0 ? 'long_break' : 'short_break')
    } else {
      setSuggested('focus')
    }
  }

  async function handleStart(kind: PomodoroKind): Promise<void> {
    setBusy(true)
    try {
      finishing.current = false
      setCycle(await window.api.pomodoro.startCycle(card.id, kind))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel(): Promise<void> {
    if (!cycle) return
    setBusy(true)
    try {
      finishing.current = true
      await window.api.pomodoro.finishCycle(card.id, cycle.id, false)
      await afterCycleEnds(cycle.kind, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveConfig(patch: PomodoroConfig): Promise<void> {
    setBusy(true)
    try {
      setConfig(
        await window.api.pomodoro.updateConfig({
          focusMinutes: patch.focusMinutes,
          shortBreakMinutes: patch.shortBreakMinutes,
          longBreakMinutes: patch.longBreakMinutes,
          cyclesBeforeLongBreak: patch.cyclesBeforeLongBreak
        })
      )
      setEditingConfig(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!config) return <p className="empty-hint">Carregando Pomodoro…</p>

  return (
    <div className="pomodoro-widget">
      {error && <p className="status status--error">{error}</p>}

      <div className="pomodoro-widget__phase">{cycle ? PHASE_LABELS[cycle.kind] : 'Pronto para começar'}</div>
      <div className="pomodoro-widget__display">
        {cycle ? formatClock(secondsLeft) : `${minutesFor(suggested, config)}min`}
      </div>

      <div className="pomodoro-widget__cycle-dots" title="Ciclos de foco até a pausa longa">
        {Array.from({ length: config.cyclesBeforeLongBreak }).map((_, i) => (
          <span
            key={i}
            className={`pomodoro-widget__dot ${i < focusCyclesDone % config.cyclesBeforeLongBreak ? 'pomodoro-widget__dot--filled' : ''}`}
          />
        ))}
      </div>

      <div className="pomodoro-widget__actions">
        {!cycle && (
          <button className="primary-button" disabled={busy} onClick={() => handleStart(suggested)}>
            ▶ Iniciar {PHASE_LABELS[suggested].toLowerCase()}
          </button>
        )}
        {!cycle && suggested !== 'focus' && (
          <button className="link-button" disabled={busy} onClick={() => handleStart('focus')}>
            pular pausa e focar
          </button>
        )}
        {cycle && (
          <button className="secondary-button" disabled={busy} onClick={handleCancel}>
            ■ Cancelar ciclo
          </button>
        )}
      </div>

      {!editingConfig && (
        <button className="link-button" onClick={() => setEditingConfig(true)}>
          Configurar durações
        </button>
      )}
      {editingConfig && <PomodoroConfigForm config={config} busy={busy} onSave={handleSaveConfig} onCancel={() => setEditingConfig(false)} />}
    </div>
  )
}

function PomodoroConfigForm({
  config,
  busy,
  onSave,
  onCancel
}: {
  config: PomodoroConfig
  busy: boolean
  onSave: (patch: PomodoroConfig) => Promise<void>
  onCancel: () => void
}): JSX.Element {
  const [focusMinutes, setFocusMinutes] = useState(config.focusMinutes)
  const [shortBreakMinutes, setShortBreakMinutes] = useState(config.shortBreakMinutes)
  const [longBreakMinutes, setLongBreakMinutes] = useState(config.longBreakMinutes)
  const [cyclesBeforeLongBreak, setCyclesBeforeLongBreak] = useState(config.cyclesBeforeLongBreak)

  return (
    <form
      className="pomodoro-config-form"
      onSubmit={(e) => {
        e.preventDefault()
        void onSave({ ...config, focusMinutes, shortBreakMinutes, longBreakMinutes, cyclesBeforeLongBreak })
      }}
    >
      <label>
        Foco (min)
        <input
          type="number"
          min={1}
          value={focusMinutes}
          onChange={(e) => setFocusMinutes(Number(e.target.value))}
        />
      </label>
      <label>
        Pausa curta (min)
        <input
          type="number"
          min={1}
          value={shortBreakMinutes}
          onChange={(e) => setShortBreakMinutes(Number(e.target.value))}
        />
      </label>
      <label>
        Pausa longa (min)
        <input
          type="number"
          min={1}
          value={longBreakMinutes}
          onChange={(e) => setLongBreakMinutes(Number(e.target.value))}
        />
      </label>
      <label>
        Ciclos até pausa longa
        <input
          type="number"
          min={1}
          value={cyclesBeforeLongBreak}
          onChange={(e) => setCyclesBeforeLongBreak(Number(e.target.value))}
        />
      </label>
      <div className="new-card-form__actions">
        <button type="submit" className="primary-button" disabled={busy}>
          Salvar
        </button>
        <button type="button" className="link-button" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
