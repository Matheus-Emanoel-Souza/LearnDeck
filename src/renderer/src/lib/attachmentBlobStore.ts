/**
 * Storage de blobs de anexo no build web (sem disco, sem servidor — ver
 * docs/WEBAPP.md). Usado por `src/web/attachmentsWeb.ts` (gravar/remover) e
 * por `attachmentImageResolver.ts` (resolver imagens do caderno pra exibir).
 * No build Electron este módulo simplesmente não é chamado (attachments vão
 * pro disco via attachmentService.ts).
 */
import { idbDelete, idbGet, idbSet, STORE_BLOBS } from '../../../web/db/idbStore'

const urlCache = new Map<string, string>()

export async function putAttachmentBlob(id: string, blob: Blob): Promise<void> {
  await idbSet(STORE_BLOBS, id, blob)
}

export async function getAttachmentBlob(id: string): Promise<Blob | undefined> {
  return idbGet<Blob>(STORE_BLOBS, id)
}

export async function deleteAttachmentBlob(id: string): Promise<void> {
  const cached = urlCache.get(id)
  if (cached) {
    URL.revokeObjectURL(cached)
    urlCache.delete(id)
  }
  await idbDelete(STORE_BLOBS, id)
}

/** Gera (e cacheia em memória) uma object URL pro blob — só é válida durante
 * esta sessão da aba, por isso nunca é o que fica salvo no Markdown. */
export async function resolveAttachmentBlobUrl(id: string): Promise<string | undefined> {
  const cached = urlCache.get(id)
  if (cached) return cached

  const blob = await getAttachmentBlob(id)
  if (!blob) return undefined

  const url = URL.createObjectURL(blob)
  urlCache.set(id, url)
  return url
}
