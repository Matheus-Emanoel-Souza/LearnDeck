import type Database from 'better-sqlite3'
import type { CreateSubtaskInput, Subtask, UpdateSubtaskInput } from '@shared/types'
import {
  deleteSubtaskRow,
  insertSubtaskRow,
  listSubtasksByCard,
  updateSubtaskRow
} from '../repositories/subtaskRepository'

export function listSubtasks(db: Database.Database, cardId: string): Subtask[] {
  return listSubtasksByCard(db, cardId)
}

export function createSubtask(db: Database.Database, input: CreateSubtaskInput): Subtask {
  if (!input.title.trim()) throw new Error('Título da subtarefa é obrigatório')
  return insertSubtaskRow(db, input)
}

export function updateSubtask(db: Database.Database, id: string, patch: UpdateSubtaskInput): Subtask {
  if (patch.title !== undefined && !patch.title.trim()) throw new Error('Título da subtarefa é obrigatório')
  return updateSubtaskRow(db, id, patch)
}

export function deleteSubtask(db: Database.Database, id: string): void {
  deleteSubtaskRow(db, id)
}
