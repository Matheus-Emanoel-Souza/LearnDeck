import type Database from 'better-sqlite3'
import type { CardStatus, DashboardSummary } from '@shared/types'
import { CARD_STATUSES } from '@shared/types'
import { listCardsForWorkspace } from '../repositories/cardRepository'
import { countCompletedFocusPomodorosForWorkspace } from '../repositories/pomodoroRepository'
import { sumClosedSessionSecondsForWorkspace } from '../repositories/studySessionRepository'

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
    totalPomodoros: countCompletedFocusPomodorosForWorkspace(db, workspaceId)
  }
}
