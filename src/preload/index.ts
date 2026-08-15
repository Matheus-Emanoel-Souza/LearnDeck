import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { AppInfo } from '../main/ipc/app'
import type {
  Card,
  CardRelation,
  CardRelationView,
  CardSummary,
  Comment,
  CreateCardInput,
  CreateCardRelationInput,
  CreateGroupInput,
  DashboardSummary,
  Group,
  Pomodoro,
  PomodoroConfig,
  PomodoroKind,
  StatusHistoryEntry,
  StudySession,
  Tag,
  UpdateCardInput,
  UpdateGroupInput,
  UpdatePomodoroConfigInput,
  UpdateStatus
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
    get: (id: string): Promise<Card | undefined> => ipcRenderer.invoke('cards:get', id),
    create: (input: CreateCardInput): Promise<Card> => ipcRenderer.invoke('cards:create', input),
    update: (id: string, patch: UpdateCardInput): Promise<Card> =>
      ipcRenderer.invoke('cards:update', id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('cards:delete', id),
    search: (workspaceId: string, query: string, excludeCardId: string): Promise<CardSummary[]> =>
      ipcRenderer.invoke('cards:search', workspaceId, query, excludeCardId),
    listAllSummaries: (workspaceId: string, excludeCardId: string): Promise<CardSummary[]> =>
      ipcRenderer.invoke('cards:listAllSummaries', workspaceId, excludeCardId)
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
  },
  timer: {
    getRunning: (cardId: string): Promise<StudySession | undefined> =>
      ipcRenderer.invoke('timer:getRunning', cardId),
    start: (cardId: string): Promise<StudySession> => ipcRenderer.invoke('timer:start', cardId),
    stop: (cardId: string): Promise<{ session: StudySession; card: Card }> =>
      ipcRenderer.invoke('timer:stop', cardId),
    listByCard: (cardId: string): Promise<StudySession[]> =>
      ipcRenderer.invoke('timer:listByCard', cardId)
  },
  pomodoro: {
    getConfig: (cardId: string): Promise<PomodoroConfig> => ipcRenderer.invoke('pomodoro:getConfig', cardId),
    updateConfig: (patch: UpdatePomodoroConfigInput): Promise<PomodoroConfig> =>
      ipcRenderer.invoke('pomodoro:updateConfig', patch),
    getOpenCycle: (cardId: string): Promise<Pomodoro | undefined> =>
      ipcRenderer.invoke('pomodoro:getOpenCycle', cardId),
    startCycle: (cardId: string, kind: PomodoroKind): Promise<Pomodoro> =>
      ipcRenderer.invoke('pomodoro:startCycle', cardId, kind),
    finishCycle: (cardId: string, pomodoroId: string, completed: boolean): Promise<Pomodoro> =>
      ipcRenderer.invoke('pomodoro:finishCycle', cardId, pomodoroId, completed),
    listByCard: (cardId: string): Promise<Pomodoro[]> => ipcRenderer.invoke('pomodoro:listByCard', cardId)
  },
  relations: {
    listByCard: (cardId: string): Promise<CardRelationView[]> =>
      ipcRenderer.invoke('relations:listByCard', cardId),
    create: (input: CreateCardRelationInput): Promise<CardRelation> =>
      ipcRenderer.invoke('relations:create', input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('relations:delete', id)
  },
  dashboard: {
    getSummary: (workspaceId: string): Promise<DashboardSummary> =>
      ipcRenderer.invoke('dashboard:getSummary', workspaceId)
  },
  updater: {
    getStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('updater:getStatus'),
    check: (): Promise<void> => ipcRenderer.invoke('updater:check'),
    download: (): Promise<void> => ipcRenderer.invoke('updater:download'),
    install: (): Promise<void> => ipcRenderer.invoke('updater:install'),
    /** Assina atualizações de status empurradas pelo main; retorna a função de cancelar a assinatura. */
    onStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, status: UpdateStatus): void => callback(status)
      ipcRenderer.on('updater:status', listener)
      return () => ipcRenderer.removeListener('updater:status', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
