import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Group, CreateGroupInput, UpdateGroupInput } from '@shared/types'

interface GroupRow {
  id: string
  workspace_id: string
  parent_group_id: string | null
  name: string
  color: string | null
  position: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    parentGroupId: row.parent_group_id,
    name: row.name,
    color: row.color,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

/** Lista todos os grupos não excluídos de um workspace (plano; hierarquia é montada no renderer). */
export function listGroups(db: Database.Database, workspaceId: string): Group[] {
  const rows = db
    .prepare(
      `SELECT * FROM groups WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY position ASC, name ASC`
    )
    .all(workspaceId) as GroupRow[]
  return rows.map(toGroup)
}

export function createGroup(db: Database.Database, input: CreateGroupInput): Group {
  const now = new Date().toISOString()
  const nextPosition = (
    db
      .prepare(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next FROM groups
         WHERE workspace_id = ? AND parent_group_id IS ? AND deleted_at IS NULL`
      )
      .get(input.workspaceId, input.parentGroupId ?? null) as { next: number }
  ).next

  const row: GroupRow = {
    id: randomUUID(),
    workspace_id: input.workspaceId,
    parent_group_id: input.parentGroupId ?? null,
    name: input.name.trim(),
    color: input.color ?? null,
    position: nextPosition,
    created_at: now,
    updated_at: now,
    deleted_at: null
  }

  db.prepare(
    `INSERT INTO groups (id, workspace_id, parent_group_id, name, color, position, created_at, updated_at, deleted_at)
     VALUES (@id, @workspace_id, @parent_group_id, @name, @color, @position, @created_at, @updated_at, @deleted_at)`
  ).run(row)

  return toGroup(row)
}

export function updateGroup(db: Database.Database, id: string, patch: UpdateGroupInput): Group {
  const current = db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as GroupRow | undefined
  if (!current) throw new Error(`Grupo não encontrado: ${id}`)

  const updated: GroupRow = {
    ...current,
    name: patch.name?.trim() ?? current.name,
    color: patch.color !== undefined ? patch.color : current.color,
    parent_group_id:
      patch.parentGroupId !== undefined ? patch.parentGroupId : current.parent_group_id,
    position: patch.position ?? current.position,
    updated_at: new Date().toISOString()
  }

  db.prepare(
    `UPDATE groups SET name = @name, color = @color, parent_group_id = @parent_group_id,
       position = @position, updated_at = @updated_at WHERE id = @id`
  ).run(updated)

  return toGroup(updated)
}

export function softDeleteGroup(db: Database.Database, id: string): void {
  db.prepare('UPDATE groups SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), id)
}
