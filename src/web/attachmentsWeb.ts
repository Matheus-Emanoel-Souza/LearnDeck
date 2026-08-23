/**
 * Equivalente web de `src/main/services/attachmentService.ts`. Metadados
 * (nome, tamanho, tipo) continuam na mesma tabela `attachments` do SQLite
 * (via attachmentRepository, sem alteração); o arquivo em si, que no desktop
 * vai pro disco, aqui vira um Blob gravado no IndexedDB (ver
 * attachmentBlobStore.ts). Sem diálogo nativo de arquivo: usa um `<input
 * type=file>` disparado programaticamente a partir do clique do usuário.
 */
import type Database from 'better-sqlite3'
import type { Attachment } from '@shared/types'
import {
  deleteAttachmentRow,
  getAttachmentRow,
  insertAttachmentRow,
  listAttachmentsByCard
} from '../main/repositories/attachmentRepository'
import {
  deleteAttachmentBlob,
  putAttachmentBlob,
  resolveAttachmentBlobUrl
} from '../renderer/src/lib/attachmentBlobStore'

function pickFiles(multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = multiple
    input.style.display = 'none'
    input.addEventListener(
      'change',
      () => {
        resolve(Array.from(input.files ?? []))
        input.remove()
      },
      { once: true }
    )
    document.body.appendChild(input)
    input.click()
  })
}

export function listAttachments(db: Database.Database, cardId: string): Attachment[] {
  return listAttachmentsByCard(db, cardId)
}

export async function pickAndAddAttachments(db: Database.Database, cardId: string): Promise<Attachment[]> {
  const files = await pickFiles(true)
  for (const file of files) {
    const id = crypto.randomUUID()
    await putAttachmentBlob(id, file)
    insertAttachmentRow(db, {
      cardId,
      fileName: file.name,
      storedPath: id, // chave do blob no IndexedDB — não é um caminho de disco no build web
      mimeType: file.type || null,
      sizeBytes: file.size
    })
  }
  return listAttachments(db, cardId)
}

export async function addAttachmentFromBuffer(
  db: Database.Database,
  cardId: string,
  fileName: string,
  data: ArrayBuffer,
  mimeType: string
): Promise<Attachment> {
  const id = crypto.randomUUID()
  await putAttachmentBlob(id, new Blob([data], { type: mimeType }))
  return insertAttachmentRow(db, { cardId, fileName, storedPath: id, mimeType, sizeBytes: data.byteLength })
}

export async function openAttachment(db: Database.Database, id: string): Promise<void> {
  const row = getAttachmentRow(db, id)
  if (!row) throw new Error(`Anexo não encontrado: ${id}`)
  const url = await resolveAttachmentBlobUrl(row.stored_path)
  if (!url) throw new Error('Arquivo do anexo não encontrado neste navegador.')
  window.open(url, '_blank', 'noopener')
}

export async function removeAttachment(db: Database.Database, id: string): Promise<void> {
  const row = getAttachmentRow(db, id)
  if (!row) throw new Error(`Anexo não encontrado: ${id}`)
  await deleteAttachmentBlob(row.stored_path)
  deleteAttachmentRow(db, id)
}
