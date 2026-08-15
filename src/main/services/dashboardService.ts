import type Database from 'better-sqlite3'
import type { CardStatus, DailyCardCount, DashboardSummary } from '@shared/types'
import { CARD_STATUSES } from '@shared/types'
import {
  countCardsCreatedByDay,
  countOpenCardsBySubject,
  listCardsForWorkspace
} from '../repositories/cardRepository'
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

/**
 * "Aberto" = ainda não começou (backlog, a estudar); "Em andamento" = já em
 * algum ponto do fluxo (estudando, pausado, revisar); "Concluído" = done.
 * Ver docs/roadmap.md — agrupamento pensado pro dashboard pedido pelo usuário.
 */
function groupStatus(status: CardStatus): 'open' | 'inProgress' | 'done' {
  if (status === 'backlog' || status === 'to_study') return 'open'
  if (status === 'done') return 'done'
  return 'inProgress'
}

export function getDashboardSummary(db: Database.Database, workspaceId: string): DashboardSummary {
  const cards = listCardsForWorkspace(db, workspaceId)

  const byStatus = CARD_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<CardStatus, number>
  )

  let openCount = 0
  let inProgressCount = 0
  let doneCount = 0

  for (const card of cards) {
    byStatus[card.status] += 1
    const group = groupStatus(card.status)
    if (group === 'open') openCount += 1
    else if (group === 'inProgress') inProgressCount += 1
    else doneCount += 1
  }

  return {
    totalCards: cards.length,
    openCount,
    inProgressCount,
    doneCount,
    byStatus,
    totalStudySeconds: sumClosedSessionSecondsForWorkspace(db, workspaceId),
    totalPomodoros: countCompletedFocusPomodorosForWorkspace(db, workspaceId),
    openCardsBySubject: countOpenCardsBySubject(db, workspaceId),
    cardsOpenedByDay: buildOpenedTrend(db, workspaceId)
  }
}
