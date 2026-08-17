import type Database from 'better-sqlite3'
import { app, dialog, shell, type BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Attachment } from '@shared/types'
import {
  deleteAttachmentRow,
  getAttachmentRow,
  insertAttachmentRow,
  listAttachmentsByCard
} from '../repositories/attachmentRepository'

function attachmentsDirForCard(cardId: string): string {
  return path.join(app.getPath('userData'), 'attachments', cardId)
}

export function listAttachments(db: Database.Database, cardId: string): Attachment[] {
  return listAttachmentsByCard(db, cardId)
}

/**
 * Abre o seletor nativo de arquivos (multi-seleção), copia cada arquivo
 * escolhido pro storage do app e grava os metadados. Roda inteiramente no
 * main — não depende do sandbox do renderer conseguir ler caminho de File.
 */
export async function pickAndAddAttachments(
  db: Database.Database,
  win: BrowserWindow | null,
  cardId: string
): Promise<Attachment[]> {
  const result = win
    ? await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] })
    : await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })

  if (result.canceled || result.filePaths.length === 0) return listAttachments(db, cardId)

  const dir = attachmentsDirForCard(cardId)
  fs.mkdirSync(dir, { recursive: true })

  for (const sourcePath of result.filePaths) {
    const originalName = path.basename(sourcePath)
    const storedName = `${randomUUID()}-${originalName}`
    const storedPath = path.join(dir, storedName)
    fs.copyFileSync(sourcePath, storedPath)
    const stat = fs.statSync(storedPath)

    insertAttachmentRow(db, {
      cardId,
      fileName: originalName,
      storedPath,
      mimeType: null,
      sizeBytes: stat.size
    })
  }

  return listAttachments(db, cardId)
}

export function openAttachment(db: Database.Database, id: string): void {
  const row = getAttachmentRow(db, id)
  if (!row) throw new Error(`Anexo não encontrado: ${id}`)
  void shell.openPath(row.stored_path)
}

export function removeAttachment(db: Database.Database, id: string): void {
  const row = getAttachmentRow(db, id)
  if (!row) throw new Error(`Anexo não encontrado: ${id}`)

  try {
    fs.unlinkSync(row.stored_path)
  } catch {
    // Arquivo já pode ter sido movido/apagado fora do app — não impede
    // remover o registro, que é o que importa pro usuário.
  }

  deleteAttachmentRow(db, id)
}
