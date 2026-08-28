import { describe, expect, it, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { runMigrations } from '../db/migrate'
import { exportBackup, importBackup, validateBackup } from './backupService'
import type { BackupFile } from '@shared/types'
import { BACKUP_FORMAT, BACKUP_VERSION } from '@shared/types'

function makeDb(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(db)
  return db
}

function iso(): string {
  return new Date().toISOString()
}

/** Monta um workspace "cheio": matéria raiz + submatéria, 2 colunas, 2 cards
 * (um em cada coluna) com subtarefa, comentário, caderno com 2 versões,
 * relação entre os dois cards, tag compartilhada, override de Pomodoro,
 * sessão de estudo + ciclo de Pomodoro ligado a ela, e histórico de status. */
function seedFullWorkspace(db: Database.Database): {
  workspaceId: string
  rootGroupId: string
  subGroupId: string
  columnAId: string
  columnBId: string
  cardAId: string
  cardBId: string
} {
  const workspaceId = randomUUID()
  db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run(
    workspaceId,
    'Workspace de teste',
    iso()
  )

  const rootGroupId = randomUUID()
  db.prepare(
    `INSERT INTO groups (id, workspace_id, parent_group_id, name, color, position, created_at, updated_at, deleted_at)
     VALUES (?, ?, NULL, 'Faculdade', '#3355ff', 0, ?, ?, NULL)`
  ).run(rootGroupId, workspaceId, iso(), iso())

  const subGroupId = randomUUID()
  db.prepare(
    `INSERT INTO groups (id, workspace_id, parent_group_id, name, color, position, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, 'Cálculo 1', NULL, 0, ?, ?, NULL)`
  ).run(subGroupId, workspaceId, rootGroupId, iso(), iso())

  const columnAId = randomUUID()
  const columnBId = randomUUID()
  db.prepare(
    `INSERT INTO board_columns (id, group_id, name, position, is_done, color, created_at, updated_at)
     VALUES (?, ?, 'A fazer', 0, 0, NULL, ?, ?)`
  ).run(columnAId, subGroupId, iso(), iso())
  db.prepare(
    `INSERT INTO board_columns (id, group_id, name, position, is_done, color, created_at, updated_at)
     VALUES (?, ?, 'Concluído', 1, 1, '#22aa55', ?, ?)`
  ).run(columnBId, subGroupId, iso(), iso())

  const cardAId = randomUUID()
  const cardBId = randomUUID()
  db.prepare(
    `INSERT INTO cards (id, group_id, title, description, column_id, position, total_study_seconds,
       pomodoros_completed, due_date, due_time, created_at, updated_at, deleted_at)
     VALUES (?, ?, 'Estudar integrais', 'derivadas e integrais', ?, 0, 120, 1, '2026-09-01', '14:00', ?, ?, NULL)`
  ).run(cardAId, subGroupId, columnAId, iso(), iso())
  db.prepare(
    `INSERT INTO cards (id, group_id, title, description, column_id, position, total_study_seconds,
       pomodoros_completed, due_date, due_time, created_at, updated_at, deleted_at)
     VALUES (?, ?, 'Estudar derivadas', NULL, ?, 0, 0, 0, NULL, NULL, ?, ?, NULL)`
  ).run(cardBId, subGroupId, columnBId, iso(), iso())

  db.prepare(
    `INSERT INTO subtasks (id, card_id, title, is_done, due_date, due_time, position, created_at, updated_at)
     VALUES (?, ?, 'Ler capítulo 3', 0, NULL, NULL, 0, ?, ?)`
  ).run(randomUUID(), cardAId, iso(), iso())

  db.prepare(
    `INSERT INTO comments (id, card_id, body, created_at, updated_at)
     VALUES (?, ?, 'Comentário de teste', ?, ?)`
  ).run(randomUUID(), cardAId, iso(), iso())

  const notebookId = randomUUID()
  db.prepare(
    `INSERT INTO notebooks (id, card_id, content_markdown, version, created_at, updated_at)
     VALUES (?, ?, '# v2', 2, ?, ?)`
  ).run(notebookId, cardAId, iso(), iso())
  db.prepare(
    `INSERT INTO notebook_versions (id, notebook_id, version, content_markdown, created_at)
     VALUES (?, ?, 1, '# v1', ?)`
  ).run(randomUUID(), notebookId, iso())
  db.prepare(
    `INSERT INTO notebook_versions (id, notebook_id, version, content_markdown, created_at)
     VALUES (?, ?, 2, '# v2', ?)`
  ).run(randomUUID(), notebookId, iso())

  db.prepare(
    `INSERT INTO card_relations (id, card_id, related_card_id, relation_type, created_at)
     VALUES (?, ?, ?, 'prerequisite_of', ?)`
  ).run(randomUUID(), cardBId, cardAId, iso())

  const tagId = randomUUID()
  db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(tagId, 'importante', '#ff0000')
  db.prepare('INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?)').run(cardAId, tagId)
  db.prepare('INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?)').run(cardBId, tagId)

  db.prepare(
    `INSERT INTO pomodoro_configs (id, card_id, focus_minutes, short_break_minutes, long_break_minutes, cycles_before_long_break)
     VALUES (?, ?, 50, 10, 20, 3)`
  ).run(randomUUID(), cardAId)

  const sessionId = randomUUID()
  db.prepare(
    `INSERT INTO study_sessions (id, card_id, started_at, ended_at, duration_seconds, source)
     VALUES (?, ?, ?, ?, 1500, 'pomodoro')`
  ).run(sessionId, cardAId, iso(), iso())

  db.prepare(
    `INSERT INTO pomodoros (id, card_id, kind, started_at, ended_at, completed, study_session_id)
     VALUES (?, ?, 'focus', ?, ?, 1, ?)`
  ).run(randomUUID(), cardAId, iso(), iso(), sessionId)

  db.prepare(
    `INSERT INTO status_history (id, card_id, from_status, to_status, changed_at)
     VALUES (?, ?, NULL, ?, ?)`
  ).run(randomUUID(), cardAId, columnAId, iso())

  return { workspaceId, rootGroupId, subGroupId, columnAId, columnBId, cardAId, cardBId }
}

function countRows(db: Database.Database, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
}

describe('backupService', () => {
  let db: Database.Database

  beforeEach(() => {
    db = makeDb()
  })

  it('exporta só os dados ativos do workspace (ignora matéria/card já excluído)', () => {
    const seed = seedFullWorkspace(db)
    db.prepare('UPDATE cards SET deleted_at = ? WHERE id = ?').run(iso(), seed.cardBId)

    const backup = exportBackup(db, seed.workspaceId)

    expect(backup.data.cards.map((c) => c.id)).toEqual([seed.cardAId])
    // A relação tinha cardB como origem — sem ele no escopo, a relação também some.
    expect(backup.data.cardRelations).toHaveLength(0)
  })

  it('exporta e reimporta um workspace inteiro preservando estrutura e relacionamentos', () => {
    const seed = seedFullWorkspace(db)
    const backup = exportBackup(db, seed.workspaceId)

    // "Restaurar depois" = importar num workspace novo, como se fosse outro dispositivo.
    const targetDb = makeDb()
    const targetWorkspaceId = randomUUID()
    targetDb
      .prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)')
      .run(targetWorkspaceId, 'Workspace novo', iso())

    const summary = importBackup(targetDb, targetWorkspaceId, backup)
    expect(summary).toEqual({ groups: 2, cards: 2 })

    const restored = exportBackup(targetDb, targetWorkspaceId)

    // Hierarquia: submatéria aponta pra matéria raiz reimportada (ids novos, mas o vínculo existe).
    const root = restored.data.groups.find((g) => g.parentGroupId === null)
    const sub = restored.data.groups.find((g) => g.parentGroupId !== null)
    expect(root?.name).toBe('Faculdade')
    expect(sub?.name).toBe('Cálculo 1')
    expect(sub?.parentGroupId).toBe(root?.id)
    expect(root?.id).not.toBe(seed.rootGroupId) // id novo, não o original

    const cardA = restored.data.cards.find((c) => c.title === 'Estudar integrais')
    const cardB = restored.data.cards.find((c) => c.title === 'Estudar derivadas')
    expect(cardA?.description).toBe('derivadas e integrais')
    expect(cardA?.dueDate).toBe('2026-09-01')
    expect(cardA?.totalStudySeconds).toBe(120)

    const columnOfA = restored.data.boardColumns.find((c) => c.id === cardA?.columnId)
    expect(columnOfA?.name).toBe('A fazer')
    const columnOfB = restored.data.boardColumns.find((c) => c.id === cardB?.columnId)
    expect(columnOfB?.name).toBe('Concluído')
    expect(columnOfB?.isDone).toBe(true)
    expect(columnOfB?.color).toBe('#22aa55')

    expect(restored.data.subtasks).toHaveLength(1)
    expect(restored.data.subtasks[0].title).toBe('Ler capítulo 3')
    expect(restored.data.subtasks[0].cardId).toBe(cardA?.id)

    expect(restored.data.comments).toHaveLength(1)
    expect(restored.data.comments[0].body).toBe('Comentário de teste')

    expect(restored.data.notebooks).toHaveLength(1)
    expect(restored.data.notebooks[0].contentMarkdown).toBe('# v2')
    const versions = restored.data.notebookVersions.filter(
      (v) => v.notebookId === restored.data.notebooks[0].id
    )
    expect(versions.map((v) => v.contentMarkdown).sort()).toEqual(['# v1', '# v2'])

    expect(restored.data.cardRelations).toHaveLength(1)
    expect(restored.data.cardRelations[0].cardId).toBe(cardB?.id)
    expect(restored.data.cardRelations[0].relatedCardId).toBe(cardA?.id)
    expect(restored.data.cardRelations[0].relationType).toBe('prerequisite_of')

    expect(restored.data.tags).toHaveLength(1)
    expect(restored.data.tags[0].name).toBe('importante')
    expect(restored.data.cardTags).toHaveLength(2)

    expect(restored.data.pomodoroConfigs).toHaveLength(1)
    expect(restored.data.pomodoroConfigs[0].focusMinutes).toBe(50)
    expect(restored.data.pomodoroConfigs[0].cardId).toBe(cardA?.id)

    expect(restored.data.studySessions).toHaveLength(1)
    expect(restored.data.studySessions[0].durationSeconds).toBe(1500)

    expect(restored.data.pomodoros).toHaveLength(1)
    expect(restored.data.pomodoros[0].studySessionId).toBe(restored.data.studySessions[0].id)

    expect(restored.data.statusHistory).toHaveLength(1)
    expect(restored.data.statusHistory[0].toStatus).toBe(columnOfA?.id)
  })

  it('importar nunca apaga nem sobrescreve dados que já existem no destino', () => {
    const source = seedFullWorkspace(db)
    const backup = exportBackup(db, source.workspaceId)

    const targetDb = makeDb()
    const targetWorkspaceId = randomUUID()
    targetDb
      .prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)')
      .run(targetWorkspaceId, 'Workspace novo', iso())
    // Dado pré-existente, sem nenhuma relação com o backup importado.
    const preexistingGroupId = randomUUID()
    targetDb
      .prepare(
        `INSERT INTO groups (id, workspace_id, parent_group_id, name, color, position, created_at, updated_at, deleted_at)
         VALUES (?, ?, NULL, 'Já existia', NULL, 0, ?, ?, NULL)`
      )
      .run(preexistingGroupId, targetWorkspaceId, iso(), iso())

    importBackup(targetDb, targetWorkspaceId, backup)

    const groups = exportBackup(targetDb, targetWorkspaceId).data.groups
    expect(groups.some((g) => g.id === preexistingGroupId && g.name === 'Já existia')).toBe(true)
    // 1 pré-existente + 2 importados (raiz + submatéria).
    expect(groups).toHaveLength(3)
  })

  it('rejeita um arquivo que não é um backup do LearnDeck, sem alterar nada', () => {
    seedFullWorkspace(db)
    const groupsBefore = countRows(db, 'groups')
    const cardsBefore = countRows(db, 'cards')

    expect(() => importBackup(db, randomUUID(), { hello: 'world' })).toThrow(/Backup inválido/)
    expect(() => importBackup(db, randomUUID(), null)).toThrow(/Backup inválido/)
    expect(() => importBackup(db, randomUUID(), 'não é nem um objeto')).toThrow(/Backup inválido/)

    expect(countRows(db, 'groups')).toBe(groupsBefore)
    expect(countRows(db, 'cards')).toBe(cardsBefore)
  })

  it('rejeita versão de backup não suportada', () => {
    const seed = seedFullWorkspace(db)
    const backup = exportBackup(db, seed.workspaceId)
    const tampered = { ...backup, version: 999 }

    expect(() => importBackup(db, randomUUID(), tampered)).toThrow(/versão de backup não suportada/)
  })

  it('rejeita backup com integridade referencial quebrada, sem alterar nada', () => {
    const seed = seedFullWorkspace(db)
    const backup = exportBackup(db, seed.workspaceId)
    const tampered: BackupFile = {
      ...backup,
      data: {
        ...backup.data,
        cards: backup.data.cards.map((c) => ({ ...c, columnId: 'coluna-que-nao-existe' }))
      }
    }

    const targetDb = makeDb()
    const targetWorkspaceId = randomUUID()
    targetDb
      .prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)')
      .run(targetWorkspaceId, 'Workspace novo', iso())

    expect(() => importBackup(targetDb, targetWorkspaceId, tampered)).toThrow(/Backup inválido/)
    expect(countRows(targetDb, 'cards')).toBe(0)
    expect(countRows(targetDb, 'groups')).toBe(0)
  })

  it('validateBackup aceita o próprio formato que exportBackup gera', () => {
    const seed = seedFullWorkspace(db)
    const backup = exportBackup(db, seed.workspaceId)
    expect(backup.format).toBe(BACKUP_FORMAT)
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(() => validateBackup(backup)).not.toThrow()
  })
})
