import { contextBridge, ipcRenderer } from 'electron'
import type { AppInfo } from '../main/ipc/app'
import type {
  Card,
  CreateCardInput,
  CreateGroupInput,
  Group,
  UpdateCardInput,
  UpdateGroupInput
} from '@shared/types'

/**
 * Única porta de entrada do renderer para o mundo Node/main. Nada além do que
 * está exposto aqui é acessível na UI (contextIsolation ligado, sandbox ligado).
 * A tipagem em index.d.ts mantém essa API sincronizada com o que o renderer enxerga.
 */
const api = {
  app: {
    getInfo: (): Promise<AppInfo> => ipcRenderer.invoke('app:getInfo')
  },
  groups: {
    list: (workspaceId: string): Promise<Group[]> => ipcRenderer.invoke('groups:list', workspaceId),
    create: (input: CreateGroupInput): Promise<Group> => ipcRenderer.invoke('groups:create', input),
    update: (id: string, patch: UpdateGroupInput): Promise<Group> =>
      ipcRenderer.invoke('groups:update', id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('groups:delete', id)
  },
  cards: {
    listByGroup: (groupId: string): Promise<Card[]> => ipcRenderer.invoke('cards:listByGroup', groupId),
    create: (input: CreateCardInput): Promise<Card> => ipcRenderer.invoke('cards:create', input),
    update: (id: string, patch: UpdateCardInput): Promise<Card> =>
      ipcRenderer.invoke('cards:update', id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('cards:delete', id)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
