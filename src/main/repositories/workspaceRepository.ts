import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Workspace } from '@shared/types'

interface WorkspaceRow {
  id: string
  name: string
  created_at: string
}

function toWorkspace(row: WorkspaceRow): Workspace {
  return { id: row.id, name: row.name, createdAt: row.created_at }
}

/**
 * Garante que existe pelo menos um workspace (hoje o app só usa um; a tabela já
 * existe pensando em multi-workspace futuro — ver docs/architecture.md).
 */
export function ensureDefaultWorkspace(db: Database.Database): Workspace {
  const existing = db.prepare('SELECT * FROM workspaces ORDER BY created_at LIMIT 1').get() as
    | WorkspaceRow
    | undefined

  if (existing) return toWorkspace(existing)

  const workspace: WorkspaceRow = {
    id: randomUUID(),
    name: 'Meus estudos',
    created_at: new Date().toISOString()
  }

  db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (@id, @name, @created_at)').run(workspace)

  return toWorkspace(workspace)
}
