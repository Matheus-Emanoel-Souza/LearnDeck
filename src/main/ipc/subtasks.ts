import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { CreateSubtaskInput, Subtask, UpdateSubtaskInput } from '@shared/types'
import { createSubtask, deleteSubtask, listSubtasks, updateSubtask } from '../services/subtaskService'
import { getWorkspaceIdForCard } from '../repositories/cardRepository'
import { scanAndBroadcast } from '../notificationScanner'

export function registerSubtasksIpc(db: Database.Database): void {
  ipcMain.handle('subtasks:listByCard', (_event, cardId: string): Subtask[] => listSubtasks(db, cardId))

  ipcMain.handle('subtasks:create', (_event, input: CreateSubtaskInput): Subtask => {
    const subtask = createSubtask(db, input)
    if (subtask.dueDate) scanAndBroadcast(db, getWorkspaceIdForCard(db, subtask.cardId) ?? '')
    return subtask
  })

  ipcMain.handle('subtasks:update', (_event, id: string, patch: UpdateSubtaskInput): Subtask => {
    const subtask = updateSubtask(db, id, patch)
    if (patch.dueDate !== undefined || patch.isDone !== undefined) {
      scanAndBroadcast(db, getWorkspaceIdForCard(db, subtask.cardId) ?? '')
    }
    return subtask
  })

  ipcMain.handle('subtasks:delete', (_event, id: string): void => deleteSubtask(db, id))
}
