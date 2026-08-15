import type Database from 'better-sqlite3'
import type { Card, StudySession } from '@shared/types'
import { getCard, setCardTotalStudySeconds } from '../repositories/cardRepository'
import {
  closeSession,
  getOpenSession,
  insertSession,
  sumClosedSessionSeconds
} from '../repositories/studySessionRepository'

/**
 * Regras do cronômetro: só pode existir uma sessão aberta por card por vez
 * (ver docs/database.md). Fechar uma sessão sempre recalcula o
 * total_study_seconds do card a partir da soma das sessões — o campo
 * desnormalizado nunca é incrementado "às cegas".
 */
export function startTimer(db: Database.Database, cardId: string, source: 'manual' | 'pomodoro' = 'manual'): StudySession {
  const existing = getOpenSession(db, cardId)
  if (existing) return existing

  return insertSession(db, cardId, source)
}

export function stopTimer(db: Database.Database, cardId: string): { session: StudySession; card: Card } {
  const open = getOpenSession(db, cardId)
  if (!open) throw new Error('Não há sessão em aberto para este card')

  const run = db.transaction(() => {
    const session = closeSession(db, open.id)
    const total = sumClosedSessionSeconds(db, cardId)
    setCardTotalStudySeconds(db, cardId, total)
    const card = getCard(db, cardId)
    if (!card) throw new Error(`Card não encontrado: ${cardId}`)
    return { session, card }
  })

  return run()
}

export function getRunningSession(db: Database.Database, cardId: string): StudySession | undefined {
  return getOpenSession(db, cardId)
}
