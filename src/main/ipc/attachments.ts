import { ipcMain, BrowserWindow } from 'electron'
import type Database from 'better-sqlite3'
import type { Attachment } from '@shared/types'
import {
  addAttachmentFromBuffer,
  listAttachments,
  openAttachment,
  pickAndAddAttachments,
  removeAttachment
} from '../services/attachmentService'

export function registerAttachmentsIpc(db: Database.Database): void {
  ipcMain.handle('attachments:listByCard', (_event, cardId: string): Attachment[] =>
    listAttachments(db, cardId)
  )

  ipcMain.handle('attachments:pickAndAdd', (event, cardId: string): Promise<Attachment[]> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return pickAndAddAttachments(db, win, cardId)
  })

  ipcMain.handle('attachments:open', (_event, id: string): void => openAttachment(db, id))

  ipcMain.handle('attachments:remove', (_event, id: string): void => removeAttachment(db, id))

  // Imagem colada (Ctrl+V) ou arrastada no caderno do card — ver CardNotebook.
  ipcMain.handle(
    'attachments:addFromBuffer',
    (_event, cardId: string, fileName: string, data: ArrayBuffer, mimeType: string): Attachment =>
      addAttachmentFromBuffer(db, cardId, fileName, Buffer.from(data), mimeType)
  )
}
