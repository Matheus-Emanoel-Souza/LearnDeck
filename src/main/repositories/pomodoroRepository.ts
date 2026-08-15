import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Pomodoro, PomodoroConfig, PomodoroKind, UpdatePomodoroConfigInput } from '@shared/types'

interface PomodoroConfigRow {
  id: string
  card_id: string | null
  focus_minutes: number
  short_break_minutes: number
  long_break_minutes: number
  cycles_before_long_break: number
}

interface PomodoroRow {
  id: string
  card_id: string
  kind: PomodoroKind
  started_at: string
  ended_at: string | null
  completed: number
  study_session_id: string | null
}

function toConfig(row: PomodoroConfigRow): PomodoroConfig {
  return {
    id: row.id,
    cardId: row.card_id,
    focusMinutes: row.focus_minutes,
    shortBreakMinutes: row.short_break_minutes,
    longBreakMinutes: row.long_break_minutes,
    cyclesBeforeLongBreak: row.cycles_before_long_break
  }
}

function toPomodoro(row: PomodoroRow): Pomodoro {
  return {
    id: row.id,
    cardId: row.card_id,
    kind: row.kind,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    completed: Boolean(row.completed),
    studySessionId: row.study_session_id
  }
}

/** Config global (card_id IS NULL) — única editável na v1, ver docs/database.md. */
export function getGlobalPomodoroConfig(db: Database.Database): PomodoroConfig {
  const row = db.prepare('SELECT * FROM pomodoro_configs WHERE card_id IS NULL LIMIT 1').get() as
    | PomodoroConfigRow
    | undefined
  if (!row) throw new Error('Config global de Pomodoro não encontrada (migration não rodou?)')
  return toConfig(row)
}

/** Config efetiva de um card: a específica dele, se existir, senão a global. */
export function getEffectivePomodoroConfig(db: Database.Database, cardId: string): PomodoroConfig {
  const row = db.prepare('SELECT * FROM pomodoro_configs WHERE card_id = ?').get(cardId) as
    | PomodoroConfigRow
    | undefined
  return row ? toConfig(row) : getGlobalPomodoroConfig(db)
}

export function updateGlobalPomodoroConfig(
  db: Database.Database,
  patch: UpdatePomodoroConfigInput
): PomodoroConfig {
  const current = getGlobalPomodoroConfig(db)
  db.prepare(
    `UPDATE pomodoro_configs
     SET focus_minutes = ?, short_break_minutes = ?, long_break_minutes = ?, cycles_before_long_break = ?
     WHERE id = ?`
  ).run(patch.focusMinutes, patch.shortBreakMinutes, patch.longBreakMinutes, patch.cyclesBeforeLongBreak, current.id)
  return getGlobalPomodoroConfig(db)
}

export function listPomodorosByCard(db: Database.Database, cardId: string): Pomodoro[] {
  const rows = db
    .prepare('SELECT * FROM pomodoros WHERE card_id = ? ORDER BY started_at DESC')
    .all(cardId) as PomodoroRow[]
  return rows.map(toPomodoro)
}

export function getOpenPomodoro(db: Database.Database, cardId: string): Pomodoro | undefined {
  const row = db
    .prepare('SELECT * FROM pomodoros WHERE card_id = ? AND ended_at IS NULL LIMIT 1')
    .get(cardId) as PomodoroRow | undefined
  return row ? toPomodoro(row) : undefined
}

export function insertPomodoro(
  db: Database.Database,
  cardId: string,
  kind: PomodoroKind,
  studySessionId: string | null
): Pomodoro {
  const row: PomodoroRow = {
    id: randomUUID(),
    card_id: cardId,
    kind,
    started_at: new Date().toISOString(),
    ended_at: null,
    completed: 0,
    study_session_id: studySessionId
  }

  db.prepare(
    `INSERT INTO pomodoros (id, card_id, kind, started_at, ended_at, completed, study_session_id)
     VALUES (@id, @card_id, @kind, @started_at, @ended_at, @completed, @study_session_id)`
  ).run(row)

  return toPomodoro(row)
}

export function closePomodoro(db: Database.Database, id: string, completed: boolean): Pomodoro {
  const current = db.prepare('SELECT * FROM pomodoros WHERE id = ?').get(id) as PomodoroRow | undefined
  if (!current) throw new Error(`Pomodoro não encontrado: ${id}`)

  const endedAt = new Date().toISOString()
  db.prepare('UPDATE pomodoros SET ended_at = ?, completed = ? WHERE id = ?').run(
    endedAt,
    completed ? 1 : 0,
    id
  )

  return toPomodoro({ ...current, ended_at: endedAt, completed: completed ? 1 : 0 })
}

/** Total de ciclos de foco concluídos no workspace inteiro (para o dashboard). */
export function countCompletedFocusPomodorosForWorkspace(db: Database.Database, workspaceId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM pomodoros p
       JOIN cards c ON c.id = p.card_id
       JOIN groups g ON g.id = c.group_id
       WHERE g.workspace_id = ? AND p.kind = 'focus' AND p.completed = 1`
    )
    .get(workspaceId) as { total: number }
  return row.total
}
