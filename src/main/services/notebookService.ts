import type Database from 'better-sqlite3'
import type { Notebook, NotebookVersion, SaveNotebookResult } from '@shared/types'
import { getCard } from '../repositories/cardRepository'
import {
  createNotebook,
  getNotebookByCard,
  getNotebookById,
  getVersion,
  listVersions,
  updateNotebookIfVersionMatches
} from '../repositories/notebookRepository'

function requireCard(db: Database.Database, cardId: string): void {
  if (!getCard(db, cardId)) throw new Error(`Card não encontrado: ${cardId}`)
}

/** Sempre retorna um caderno pro card — cria vazio na primeira vez que a
 * aba Caderno é aberta, pra tela já ter id/version pra trabalhar em cima. */
export function getOrCreateNotebook(db: Database.Database, cardId: string): Notebook {
  requireCard(db, cardId)
  return getNotebookByCard(db, cardId) ?? createNotebook(db, cardId, '')
}

/**
 * Salva o conteúdo do caderno com trava otimista: se `baseVersion` não bater
 * com a versão atual no banco (outra janela salvou por cima nesse meio-tempo),
 * devolve `status: 'conflict'` com o conteúdo atual — quem chamou decide se
 * sobrescreve, mescla ou avisa o usuário, mas nunca perde silenciosamente a
 * edição alheia.
 */
export function saveNotebook(
  db: Database.Database,
  cardId: string,
  contentMarkdown: string,
  baseVersion: number
): SaveNotebookResult {
  requireCard(db, cardId)
  const existing = getNotebookByCard(db, cardId)

  if (!existing) {
    // Ainda não existe caderno — só é conflito se o cliente achava que já
    // tinha lido uma versão (baseVersion > 0 sem caderno correspondente).
    const notebook = createNotebook(db, cardId, contentMarkdown)
    return { status: 'ok', notebook }
  }

  const updated = updateNotebookIfVersionMatches(db, existing.id, baseVersion, contentMarkdown)
  if (!updated) return { status: 'conflict', notebook: existing }
  return { status: 'ok', notebook: updated }
}

export function listNotebookVersions(db: Database.Database, cardId: string): NotebookVersion[] {
  requireCard(db, cardId)
  const notebook = getNotebookByCard(db, cardId)
  if (!notebook) return []
  return listVersions(db, notebook.id)
}

/** Restaura uma versão antiga: grava o conteúdo dela como uma nova versão
 * (não apaga o histórico, só "avança" pro conteúdo antigo). */
export function restoreNotebookVersion(
  db: Database.Database,
  cardId: string,
  version: number,
  baseVersion: number
): SaveNotebookResult {
  requireCard(db, cardId)
  const notebook = getNotebookByCard(db, cardId)
  if (!notebook) throw new Error('Caderno ainda não existe para este card.')

  const target = getVersion(db, notebook.id, version)
  if (!target) throw new Error(`Versão ${version} não encontrada.`)

  const updated = updateNotebookIfVersionMatches(db, notebook.id, baseVersion, target.contentMarkdown)
  if (!updated) return { status: 'conflict', notebook }
  return { status: 'ok', notebook: updated }
}

export { getNotebookById }
