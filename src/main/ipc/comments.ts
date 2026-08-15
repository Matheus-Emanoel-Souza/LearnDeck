import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Comment } from '@shared/types'
import { createComment, deleteComment, listCommentsByCard } from '../repositories/commentRepository'

export function registerCommentsIpc(db: Database.Database): void {
  ipcMain.handle('comments:listByCard', (_event, cardId: string): Comment[] =>
    listCommentsByCard(db, cardId)
  )

  ipcMain.handle('comments:create', (_event, cardId: string, body: string): Comment => {
    if (!body.trim()) throw new Error('Comentário vazio')
    return createComment(db, cardId, body)
  })

  ipcMain.handle('comments:delete', (_event, id: string): void => deleteComment(db, id))
}
