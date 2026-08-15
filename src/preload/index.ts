import { contextBridge, ipcRenderer } from 'electron'
import type { AppInfo } from '../main/ipc/app'
import type {
  Card,
  Comment,
  CreateCardInput,
  CreateGroupInput,
  Group,
  StatusHistoryEntry,
  Tag,
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
  },
  comments: {
    listByCard: (cardId: string): Promise<Comment[]> => ipcRenderer.invoke('comments:listByCard', cardId),
    create: (cardId: string, body: string): Promise<Comment> =>
      ipcRenderer.invoke('comments:create', cardId, body),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('comments:delete', id)
  },
  tags: {
    listForCard: (cardId: string): Promise<Tag[]> => ipcRenderer.invoke('tags:listForCard', cardId),
    attachToCard: (cardId: string, tagName: string): Promise<Tag[]> =>
      ipcRenderer.invoke('tags:attachToCard', cardId, tagName),
    detachFromCard: (cardId: string, tagId: string): Promise<Tag[]> =>
      ipcRenderer.invoke('tags:detachFromCard', cardId, tagId)
  },
  history: {
    listByCard: (cardId: string): Promise<StatusHistoryEntry[]> =>
      ipcRenderer.invoke('history:listByCard', cardId)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
