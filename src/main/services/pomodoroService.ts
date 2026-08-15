import type Database from 'better-sqlite3'
import type { Pomodoro, PomodoroConfig, PomodoroKind, UpdatePomodoroConfigInput } from '@shared/types'
import { incrementCardPomodorosCompleted, setCardTotalStudySeconds } from '../repositories/cardRepository'
import {
  closePomodoro,
  getEffectivePomodoroConfig,
  getOpenPomodoro,
  insertPomodoro,
  listPomodorosByCard,
  updateGlobalPomodoroConfig
} from '../repositories/pomodoroRepository'
import { closeSession, insertSession, sumClosedSessionSeconds } from '../repositories/studySessionRepository'

/**
 * Um ciclo de foco do Pomodoro sempre carrega junto uma study_session
 * (source: 'pomodoro') — assim o tempo focado também conta pro cronômetro
 * total do card. Ciclos de pausa (short/long break) não geram sessão.
 */
export function startCycle(db: Database.Database, cardId: string, kind: PomodoroKind): Pomodoro {
  const existing = getOpenPomodoro(db, cardId)
  if (existing) return existing

  const run = db.transaction(() => {
    const studySessionId = kind === 'focus' ? insertSession(db, cardId, 'pomodoro').id : null
    return insertPomodoro(db, cardId, kind, studySessionId)
  })

  return run()
}

export function finishCycle(
  db: Database.Database,
  cardId: string,
  pomodoroId: string,
  completed: boolean
): Pomodoro {
  const run = db.transaction(() => {
    const pomodoro = closePomodoro(db, pomodoroId, completed)

    if (pomodoro.studySessionId) {
      closeSession(db, pomodoro.studySessionId)
      const total = sumClosedSessionSeconds(db, cardId)
      setCardTotalStudySeconds(db, cardId, total)
    }

    if (pomodoro.kind === 'focus' && completed) {
      incrementCardPomodorosCompleted(db, cardId)
    }

    return pomodoro
  })

  return run()
}

export function getConfig(db: Database.Database, cardId: string): PomodoroConfig {
  return getEffectivePomodoroConfig(db, cardId)
}

export function updateConfig(db: Database.Database, patch: UpdatePomodoroConfigInput): PomodoroConfig {
  if (patch.focusMinutes <= 0 || patch.shortBreakMinutes <= 0 || patch.longBreakMinutes <= 0) {
    throw new Error('Durações do Pomodoro devem ser maiores que zero')
  }
  if (patch.cyclesBeforeLongBreak <= 0) {
    throw new Error('Ciclos até a pausa longa deve ser maior que zero')
  }
  return updateGlobalPomodoroConfig(db, patch)
}

export function getOpenCycle(db: Database.Database, cardId: string): Pomodoro | undefined {
  return getOpenPomodoro(db, cardId)
}

export function listCycles(db: Database.Database, cardId: string): Pomodoro[] {
  return listPomodorosByCard(db, cardId)
}
