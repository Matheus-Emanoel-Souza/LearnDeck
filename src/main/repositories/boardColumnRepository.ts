import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { BoardColumn, CreateBoardColumnInput } from '@shared/types'

interface BoardColumnRow {
  id: string
  workspace_id: string
  name: string
  position: number
  is_done: number
  color: string | null
  created_at: string
  updated_at: string
}

function toBoardColumn(row: BoardColumnRow): BoardColumn {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    position: row.position,
    isDone: row.is_done === 1,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listBoardColumns(db: Database.Database, workspaceId: string): BoardColumn[] {
  const rows = db
    .prepare('SELECT * FROM board_columns WHERE workspace_id = ? ORDER BY position ASC')
    .all(workspaceId) as BoardColumnRow[]
  return rows.map(toBoardColumn)
}

export function getBoardColumn(db: Database.Database, id: string): BoardColumn | undefined {
  const row = db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id) as
    | BoardColumnRow
    | undefined
  return row ? toBoardColumn(row) : undefined
}

/** Coluna onde cards novos entram: a primeira (menor posição) do workspace. */
export function getDefaultBoardColumn(db: Database.Database, workspaceId: string): BoardColumn | undefined {
  const row = db
    .prepare('SELECT * FROM board_columns WHERE workspace_id = ? ORDER BY position ASC LIMIT 1')
    .get(workspaceId) as BoardColumnRow | undefined
  return row ? toBoardColumn(row) : undefined
}

export function insertBoardColumn(db: Database.Database, input: CreateBoardColumnInput): BoardColumn {
  const now = new Date().toISOString()
  const nextPosition = (
    db
      .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM board_columns WHERE workspace_id = ?')
      .get(input.workspaceId) as { next: number }
  ).next

  const row: BoardColumnRow = {
    id: randomUUID(),
    workspace_id: input.workspaceId,
    name: input.name.trim(),
    position: nextPosition,
    is_done: 0,
    color: null,
    created_at: now,
    updated_at: now
  }

  db.prepare(
    `INSERT INTO board_columns (id, workspace_id, name, position, is_done, color, created_at, updated_at)
     VALUES (@id, @workspace_id, @name, @position, @is_done, @color, @created_at, @updated_at)`
  ).run(row)

  return toBoardColumn(row)
}

export function updateBoardColumnRow(
  db: Database.Database,
  id: string,
  patch: { name?: string; position?: number; isDone?: boolean; color?: string | null }
): BoardColumn {
  const current = db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id) as
    | BoardColumnRow
    | undefined
  if (!current) throw new Error(`Coluna não encontrada: ${id}`)

  const updated: BoardColumnRow = {
    ...current,
    name: patch.name?.trim() ?? current.name,
    position: patch.position ?? current.position,
    is_done: patch.isDone !== undefined ? (patch.isDone ? 1 : 0) : current.is_done,
    color: patch.color !== undefined ? patch.color : current.color,
    updated_at: new Date().toISOString()
  }

  db.prepare(
    `UPDATE board_columns SET name = @name, position = @position, is_done = @is_done,
       color = @color, updated_at = @updated_at WHERE id = @id`
  ).run(updated)

  return toBoardColumn(updated)
}

/** Reordena de uma vez, via drag-and-drop no quadro: `orderedIds` já vem na
 * ordem final desejada — grava position = índice de cada id na lista. */
export function reorderBoardColumnPositions(
  db: Database.Database,
  orderedIds: string[]
): void {
  const stmt = db.prepare('UPDATE board_columns SET position = ?, updated_at = ? WHERE id = ?')
  const now = new Date().toISOString()
  const run = db.transaction(() => {
    orderedIds.forEach((id, index) => stmt.run(index, now, id))
  })
  run()
}

export function countCardsInColumn(db: Database.Database, columnId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM cards WHERE column_id = ? AND deleted_at IS NULL')
    .get(columnId) as { n: number }
  return row.n
}

export function countBoardColumns(db: Database.Database, workspaceId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM board_columns WHERE workspace_id = ?')
    .get(workspaceId) as { n: number }
  return row.n
}

export function deleteBoardColumnRow(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM board_columns WHERE id = ?').run(id)
}
