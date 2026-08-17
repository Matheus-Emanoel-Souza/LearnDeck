import type Database from 'better-sqlite3'
import type { AppNotification } from '@shared/types'
import { listBoardColumns } from '../repositories/boardColumnRepository'
import { listCardsWithDueDate } from '../repositories/cardRepository'
import { listSubtasksWithDueDate } from '../repositories/subtaskRepository'
import {
  countUnreadNotifications,
  insertNotificationIfAbsent,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../repositories/notificationRepository'
import { combineDueAt, isOverdue } from '../lib/dueDate'

export function getNotifications(db: Database.Database, workspaceId: string): AppNotification[] {
  return listNotifications(db, workspaceId)
}

export function getUnreadCount(db: Database.Database, workspaceId: string): number {
  return countUnreadNotifications(db, workspaceId)
}

export function readNotification(db: Database.Database, id: string): void {
  markNotificationRead(db, id)
}

export function readAllNotifications(db: Database.Database, workspaceId: string): void {
  markAllNotificationsRead(db, workspaceId)
}

/**
 * Varre cards e subtarefas com prazo vencido (e ainda não concluídos) e
 * grava uma notificação pra cada um que ainda não tem — o índice único em
 * notifications garante que reescanear o mesmo vencimento não duplica.
 * Concluído = coluna com is_done (card) / is_done (subtarefa): nunca gera
 * notificação de atraso. Retorna true se alguma notificação nova entrou,
 * pro caller decidir se avisa o renderer.
 */
export function scanForOverdue(db: Database.Database, workspaceId: string): boolean {
  const now = new Date()
  let createdAny = false

  const doneColumnIds = new Set(
    listBoardColumns(db, workspaceId)
      .filter((c) => c.isDone)
      .map((c) => c.id)
  )

  for (const card of listCardsWithDueDate(db, workspaceId)) {
    if (!card.dueDate || doneColumnIds.has(card.columnId)) continue
    if (!isOverdue(card.dueDate, card.dueTime, now)) continue

    const inserted = insertNotificationIfAbsent(db, {
      workspaceId,
      kind: 'card',
      cardId: card.id,
      subtaskId: null,
      message: `O ticket "${card.title}" venceu`,
      dueAt: combineDueAt(card.dueDate, card.dueTime)
    })
    if (inserted) createdAny = true
  }

  for (const subtask of listSubtasksWithDueDate(db, workspaceId)) {
    if (!subtask.dueDate || subtask.isDone) continue
    if (!isOverdue(subtask.dueDate, subtask.dueTime, now)) continue

    const inserted = insertNotificationIfAbsent(db, {
      workspaceId,
      kind: 'subtask',
      cardId: subtask.cardId,
      subtaskId: subtask.id,
      message: `A subtarefa "${subtask.title}" venceu`,
      dueAt: combineDueAt(subtask.dueDate, subtask.dueTime)
    })
    if (inserted) createdAny = true
  }

  return createdAny
}
