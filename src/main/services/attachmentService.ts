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

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml'
])
const MAX_PASTED_IMAGE_BYTES = 15 * 1024 * 1024 // 15 MB — cobre print de tela sem exagero.

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

/**
 * Usado pelo caderno do card: imagem colada (Ctrl+V) ou arrastada direto no
 * editor. Vem como buffer (não como caminho de arquivo, o clipboard/drag não
 * expõe um), então grava direto — mesma pasta/mesmo registro dos anexos
 * escolhidos pelo seletor nativo, só que validando tipo e tamanho porque a
 * origem não passou pelo diálogo do SO.
 */
export function addAttachmentFromBuffer(
  db: Database.Database,
  cardId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Attachment {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error(`Tipo de imagem não suportado: ${mimeType}`)
  }
  if (buffer.byteLength > MAX_PASTED_IMAGE_BYTES) {
    throw new Error('Imagem maior que o limite de 15 MB.')
  }

  const dir = attachmentsDirForCard(cardId)
  fs.mkdirSync(dir, { recursive: true })

  const storedName = `${randomUUID()}-${fileName}`
  const storedPath = path.join(dir, storedName)
  fs.writeFileSync(storedPath, buffer)

  return insertAttachmentRow(db, {
    cardId,
    fileName,
    storedPath,
    mimeType,
    sizeBytes: buffer.byteLength
  })
}

/** Lê o arquivo do anexo pro protocolo customizado `ldattach://` exibir a
 * imagem inline no caderno — ver registerAttachmentProtocol em main/index.ts. */
export function readAttachmentFile(
  db: Database.Database,
  cardId: string,
  attachmentId: string
): { data: Buffer; mimeType: string } | undefined {
  const row = getAttachmentRow(db, attachmentId)
  // card_id embutido na própria URL: uma imagem só é servida se o pedido
  // veio do caderno do card dono dela — evita um caderno referenciar (por
  // engano ou de propósito) o anexo de outro card.
  if (!row || row.card_id !== cardId) return undefined
  if (!fs.existsSync(row.stored_path)) return undefined
  return { data: fs.readFileSync(row.stored_path), mimeType: row.mime_type ?? 'application/octet-stream' }
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
