import type Database from 'better-sqlite3'
import type { CalendarItem } from '@shared/types'
import { listBoardColumns } from '../repositories/boardColumnRepository'
import { listCardsForWorkspace, listCardsWithDueDate } from '../repositories/cardRepository'
import { listSubtasksWithDueDate } from '../repositories/subtaskRepository'

/** Cards + subtarefas com prazo, workspace inteiro (o calendário não é por
 * grupo/quadro) — cada um já traz o essencial pro clique abrir o ticket. */
export function getCalendarItems(db: Database.Database, workspaceId: string): CalendarItem[] {
  const doneColumnIds = new Set(
    listBoardColumns(db, workspaceId)
      .filter((c) => c.isDone)
      .map((c) => c.id)
  )

  const cardItems: CalendarItem[] = listCardsWithDueDate(db, workspaceId)
    .filter((card) => card.dueDate)
    .map((card) => ({
      id: card.id,
      kind: 'card',
      title: card.title,
      dueDate: card.dueDate as string,
      dueTime: card.dueTime,
      isDone: doneColumnIds.has(card.columnId),
      cardId: card.id,
      cardTitle: card.title,
      groupId: card.groupId
    }))

  // Mapa de todos os cards do workspace (não só os com prazo) — uma
  // subtarefa pode ter prazo mesmo que o card-pai não tenha.
  const allCardsById = new Map(listCardsForWorkspace(db, workspaceId).map((c) => [c.id, c]))

  const subtaskItems: CalendarItem[] = listSubtasksWithDueDate(db, workspaceId)
    .filter((subtask) => subtask.dueDate)
    .map((subtask) => {
      const parentCard = allCardsById.get(subtask.cardId)
      return {
        id: subtask.id,
        kind: 'subtask',
        title: subtask.title,
        dueDate: subtask.dueDate as string,
        dueTime: subtask.dueTime,
        isDone: subtask.isDone,
        cardId: subtask.cardId,
        cardTitle: parentCard?.title ?? '',
        groupId: parentCard?.groupId ?? ''
      }
    })

  return [...cardItems, ...subtaskItems]
}
