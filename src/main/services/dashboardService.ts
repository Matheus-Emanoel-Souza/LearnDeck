import type Database from 'better-sqlite3'
import type { ColumnCardCount, DailyCardCount, DashboardSummary } from '@shared/types'
import {
  countCardsCreatedByDay,
  countOpenCardsBySubject,
  listCardsForWorkspace
} from '../repositories/cardRepository'
import { listBoardColumnsForWorkspace } from '../repositories/boardColumnRepository'
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
  // Cada matéria tem seu próprio conjunto de colunas agora — pega o de todas
  // pra manter o dashboard como uma visão do workspace inteiro.
  const columns = listBoardColumnsForWorkspace(db, workspaceId)
  const isDoneByColumn = new Map(columns.map((c) => [c.id, c.isDone]))

  const countByColumnId = new Map<string, number>()
  let openCount = 0
  let doneCount = 0

  for (const card of cards) {
    countByColumnId.set(card.columnId, (countByColumnId.get(card.columnId) ?? 0) + 1)
    if (isDoneByColumn.get(card.columnId)) doneCount += 1
    else openCount += 1
  }

  // Colunas de matérias diferentes com o mesmo nome (ex.: "Backlog" em cada
  // uma) contam juntas no gráfico — senão a mesma etapa apareceria repetida
  // uma vez por matéria.
  const countByName = new Map<string, number>()
  for (const column of columns) {
    const count = countByColumnId.get(column.id) ?? 0
    countByName.set(column.name, (countByName.get(column.name) ?? 0) + count)
  }

  const byColumn: ColumnCardCount[] = Array.from(countByName.entries()).map(([columnName, count]) => ({
    columnId: columnName,
    columnName,
    count
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
