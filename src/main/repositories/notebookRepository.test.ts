import { describe, expect, it, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { runMigrations } from '../db/migrate'
import {
  createNotebook,
  getNotebookByCard,
  listVersions,
  updateNotebookIfVersionMatches
} from './notebookRepository'

function makeDb(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(db)
  return db
}

function makeCard(db: Database.Database): string {
  const workspaceId = randomUUID()
  db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run(
    workspaceId,
    'Workspace',
    new Date().toISOString()
  )
  const groupId = randomUUID()
  db.prepare(
    `INSERT INTO groups (id, workspace_id, parent_group_id, name, color, position, created_at, updated_at, deleted_at)
     VALUES (?, ?, NULL, 'Grupo', NULL, 0, ?, ?, NULL)`
  ).run(groupId, workspaceId, new Date().toISOString(), new Date().toISOString())
  const columnId = randomUUID()
  db.prepare(
    `INSERT INTO board_columns (id, group_id, name, position, is_done, color, created_at, updated_at)
     VALUES (?, ?, 'A fazer', 0, 0, NULL, ?, ?)`
  ).run(columnId, groupId, new Date().toISOString(), new Date().toISOString())
  const cardId = randomUUID()
  db.prepare(
    `INSERT INTO cards (id, group_id, title, description, column_id, position, total_study_seconds,
      pomodoros_completed, due_date, due_time, created_at, updated_at, deleted_at)
     VALUES (?, ?, 'Card', NULL, ?, 0, 0, 0, NULL, NULL, ?, ?, NULL)`
  ).run(cardId, groupId, columnId, new Date().toISOString(), new Date().toISOString())
  return cardId
}

describe('notebookRepository', () => {
  let db: Database.Database
  let cardId: string

  beforeEach(() => {
    db = makeDb()
    cardId = makeCard(db)
  })

  it('cria o caderno com versão 1 e um snapshot inicial', () => {
    const notebook = createNotebook(db, cardId, '# Olá')
    expect(notebook.version).toBe(1)
    expect(notebook.contentMarkdown).toBe('# Olá')
    expect(listVersions(db, notebook.id)).toHaveLength(1)
  })

  it('salva com sucesso quando a baseVersion bate com a atual', () => {
    const notebook = createNotebook(db, cardId, '')
    const updated = updateNotebookIfVersionMatches(db, notebook.id, 1, 'novo conteúdo')
    expect(updated?.version).toBe(2)
    expect(updated?.contentMarkdown).toBe('novo conteúdo')
    expect(getNotebookByCard(db, cardId)?.version).toBe(2)
    expect(listVersions(db, notebook.id)).toHaveLength(2)
  })

  it('recusa o save (trava otimista) quando a baseVersion está desatualizada', () => {
    const notebook = createNotebook(db, cardId, '')
    updateNotebookIfVersionMatches(db, notebook.id, 1, 'edição da janela A')

    // Janela B ainda achava que a versão era 1 — não pode sobrescrever.
    const conflictResult = updateNotebookIfVersionMatches(db, notebook.id, 1, 'edição da janela B')
    expect(conflictResult).toBeUndefined()
    expect(getNotebookByCard(db, cardId)?.contentMarkdown).toBe('edição da janela A')
  })

  it('nunca perde histórico ao restaurar (grava como nova versão)', () => {
    const notebook = createNotebook(db, cardId, 'v1')
    updateNotebookIfVersionMatches(db, notebook.id, 1, 'v2')
    // "Restaurar" v1 = gravar o conteúdo de v1 como uma v3 nova.
    const restored = updateNotebookIfVersionMatches(db, notebook.id, 2, 'v1')
    expect(restored?.version).toBe(3)
    expect(listVersions(db, notebook.id).map((v) => v.version)).toEqual([3, 2, 1])
  })
})
