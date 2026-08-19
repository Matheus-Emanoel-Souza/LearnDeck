import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Notebook, NotebookVersion } from '@shared/types'

interface NotebookRow {
  id: string
  card_id: string
  content_markdown: string
  version: number
  created_at: string
  updated_at: string
}

interface NotebookVersionRow {
  id: string
  notebook_id: string
  version: number
  content_markdown: string
  created_at: string
}

function toNotebook(row: NotebookRow): Notebook {
  return {
    id: row.id,
    cardId: row.card_id,
    contentMarkdown: row.content_markdown,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toVersion(row: NotebookVersionRow): NotebookVersion {
  return {
    id: row.id,
    notebookId: row.notebook_id,
    version: row.version,
    contentMarkdown: row.content_markdown,
    createdAt: row.created_at
  }
}

export function getNotebookByCard(db: Database.Database, cardId: string): Notebook | undefined {
  const row = db.prepare('SELECT * FROM notebooks WHERE card_id = ?').get(cardId) as
    | NotebookRow
    | undefined
  return row ? toNotebook(row) : undefined
}

/** Cria o caderno do card na primeira vez que algo é salvo (vazio ou com o
 * conteúdo do modelo já escolhido na tela). */
export function createNotebook(db: Database.Database, cardId: string, contentMarkdown: string): Notebook {
  const now = new Date().toISOString()
  const row: NotebookRow = {
    id: randomUUID(),
    card_id: cardId,
    content_markdown: contentMarkdown,
    version: 1,
    created_at: now,
    updated_at: now
  }
  db.prepare(
    `INSERT INTO notebooks (id, card_id, content_markdown, version, created_at, updated_at)
     VALUES (@id, @card_id, @content_markdown, @version, @created_at, @updated_at)`
  ).run(row)
  db.prepare(
    `INSERT INTO notebook_versions (id, notebook_id, version, content_markdown, created_at)
     VALUES (?, ?, 1, ?, ?)`
  ).run(randomUUID(), row.id, contentMarkdown, now)
  return toNotebook(row)
}

/**
 * Atualiza o conteúdo só se `baseVersion` bater com a versão atual (trava
 * otimista). Retorna `undefined` em caso de conflito — quem chama decide o
 * que fazer (ver notebookService.saveNotebook).
 */
export function updateNotebookIfVersionMatches(
  db: Database.Database,
  notebookId: string,
  baseVersion: number,
  contentMarkdown: string
): Notebook | undefined {
  const now = new Date().toISOString()
  const nextVersion = baseVersion + 1

  const result = db
    .prepare(
      `UPDATE notebooks SET content_markdown = ?, version = ?, updated_at = ?
       WHERE id = ? AND version = ?`
    )
    .run(contentMarkdown, nextVersion, now, notebookId, baseVersion)

  if (result.changes === 0) return undefined

  db.prepare(
    `INSERT INTO notebook_versions (id, notebook_id, version, content_markdown, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(randomUUID(), notebookId, nextVersion, contentMarkdown, now)

  return getNotebookById(db, notebookId)
}

export function getNotebookById(db: Database.Database, id: string): Notebook | undefined {
  const row = db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id) as NotebookRow | undefined
  return row ? toNotebook(row) : undefined
}

export function listVersions(db: Database.Database, notebookId: string): NotebookVersion[] {
  const rows = db
    .prepare('SELECT * FROM notebook_versions WHERE notebook_id = ? ORDER BY version DESC')
    .all(notebookId) as NotebookVersionRow[]
  return rows.map(toVersion)
}

export function getVersion(
  db: Database.Database,
  notebookId: string,
  version: number
): NotebookVersion | undefined {
  const row = db
    .prepare('SELECT * FROM notebook_versions WHERE notebook_id = ? AND version = ?')
    .get(notebookId, version) as NotebookVersionRow | undefined
  return row ? toVersion(row) : undefined
}
