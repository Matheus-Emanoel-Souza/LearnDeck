import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { StudySession } from '@shared/types'

interface StudySessionRow {
  id: string
  card_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  source: 'manual' | 'pomodoro'
}

function toSession(row: StudySessionRow): StudySession {
  return {
    id: row.id,
    cardId: row.card_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    source: row.source
  }
}

export function listSessionsByCard(db: Database.Database, cardId: string): StudySession[] {
  const rows = db
    .prepare('SELECT * FROM study_sessions WHERE card_id = ? ORDER BY started_at DESC')
    .all(cardId) as StudySessionRow[]
  return rows.map(toSession)
}

/** Sessão em aberto (cronômetro rodando) para o card, se houver — só pode existir uma por vez. */
export function getOpenSession(db: Database.Database, cardId: string): StudySession | undefined {
  const row = db
    .prepare('SELECT * FROM study_sessions WHERE card_id = ? AND ended_at IS NULL LIMIT 1')
    .get(cardId) as StudySessionRow | undefined
  return row ? toSession(row) : undefined
}

export function insertSession(
  db: Database.Database,
  cardId: string,
  source: 'manual' | 'pomodoro'
): StudySession {
  const row: StudySessionRow = {
    id: randomUUID(),
    card_id: cardId,
    started_at: new Date().toISOString(),
    ended_at: null,
    duration_seconds: null,
    source
  }

  db.prepare(
    `INSERT INTO study_sessions (id, card_id, started_at, ended_at, duration_seconds, source)
     VALUES (@id, @card_id, @started_at, @ended_at, @duration_seconds, @source)`
  ).run(row)

  return toSession(row)
}

export function closeSession(db: Database.Database, sessionId: string): StudySession {
  const current = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(sessionId) as
    | StudySessionRow
    | undefined
  if (!current) throw new Error(`Sessão não encontrada: ${sessionId}`)

  const endedAt = new Date().toISOString()
  const durationSeconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(current.started_at).getTime()) / 1000)
  )

  db.prepare('UPDATE study_sessions SET ended_at = ?, duration_seconds = ? WHERE id = ?').run(
    endedAt,
    durationSeconds,
    sessionId
  )

  return toSession({ ...current, ended_at: endedAt, duration_seconds: durationSeconds })
}

/** Soma das sessões já fechadas de um card — fonte da verdade do total_study_seconds do card. */
export function sumClosedSessionSeconds(db: Database.Database, cardId: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(duration_seconds), 0) AS total FROM study_sessions
       WHERE card_id = ? AND ended_at IS NOT NULL`
    )
    .get(cardId) as { total: number }
  return row.total
}

/** Soma de todas as sessões fechadas do workspace inteiro (para o dashboard). */
export function sumClosedSessionSecondsForWorkspace(db: Database.Database, workspaceId: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(s.duration_seconds), 0) AS total
       FROM study_sessions s
       JOIN cards c ON c.id = s.card_id
       JOIN groups g ON g.id = c.group_id
       WHERE g.workspace_id = ? AND s.ended_at IS NOT NULL`
    )
    .get(workspaceId) as { total: number }
  return row.total
}
