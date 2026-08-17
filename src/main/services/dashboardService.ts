import type Database from 'better-sqlite3'
import type { ColumnCardCount, DailyCardCount, DashboardSummary } from '@shared/types'
import {
  countCardsCreatedByDay,
  countOpenCardsBySubject,
  listCardsForWorkspace
} from '../repositories/cardRepository'
import { listBoardColumns } from '../repositories/boardColumnRepository'
import { countCompletedFocusPomodorosForWorkspace } from '../repositories/pomodoroRepository'
import { sumClosedSessionSecondsForWorkspace } from '../repositories/studySessionRepository'

const OPENED_TREND_DAYS = 7

/** Os últimos `days` dias (incluindo hoje) como 'YYYY-MM-DD', em ordem crescente. */
function lastNDays(days: number): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

/** Preenche com zero os dias sem card criado, para o gráfico de linha nunca pular uma data. */
function buildOpenedTrend(db: Database.Database, workspaceId: string): DailyCardCount[] {
  const raw = countCardsCreatedByDay(db, workspaceId, OPENED_TREND_DAYS)
  const countByDate = new Map(raw.map((row) => [row.date, row.count]))
  return lastNDays(OPENED_TREND_DAYS).map((date) => ({ date, count: countByDate.get(date) ?? 0 }))
}

export function getDashboardSummary(db: Database.Database, workspaceId: string): DashboardSummary {
  const cards = listCardsForWorkspace(db, workspaceId)
  const columns = listBoardColumns(db, workspaceId)
  const isDoneByColumn = new Map(columns.map((c) => [c.id, c.isDone]))

  const countByColumn = new Map<string, number>(columns.map((c) => [c.id, 0]))
  let openCount = 0
  let doneCount = 0

  for (const card of cards) {
    countByColumn.set(card.columnId, (countByColumn.get(card.columnId) ?? 0) + 1)
    if (isDoneByColumn.get(card.columnId)) doneCount += 1
    else openCount += 1
  }

  const byColumn: ColumnCardCount[] = columns.map((column) => ({
    columnId: column.id,
    columnName: column.name,
    count: countByColumn.get(column.id) ?? 0
  }))

  return {
    totalCards: cards.length,
    openCount,
    doneCount,
    byColumn,
    totalStudySeconds: sumClosedSessionSecondsForWorkspace(db, workspaceId),
    totalPomodoros: countCompletedFocusPomodorosForWorkspace(db, workspaceId),
    openCardsBySubject: countOpenCardsBySubject(db, workspaceId),
    cardsOpenedByDay: buildOpenedTrend(db, workspaceId)
  }
}
