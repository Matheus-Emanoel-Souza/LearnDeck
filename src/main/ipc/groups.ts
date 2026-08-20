import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { CreateGroupInput, Group, UpdateGroupInput } from '@shared/types'
import { listGroups, updateGroup } from '../repositories/groupRepository'
import { createGroup, deleteGroup } from '../services/groupService'

export function registerGroupsIpc(db: Database.Database): void {
  ipcMain.handle('groups:list', (_event, workspaceId: string): Group[] => listGroups(db, workspaceId))

  ipcMain.handle('groups:create', (_event, input: CreateGroupInput): Group => createGroup(db, input))

  ipcMain.handle(
    'groups:update',
    (_event, id: string, patch: UpdateGroupInput): Group => updateGroup(db, id, patch)
  )

  ipcMain.handle('groups:delete', (_event, id: string): void => deleteGroup(db, id))
}
