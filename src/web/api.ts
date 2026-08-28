/**
 * Substitui, no build web, a dupla preload+ipcMain do Electron
 * (`src/preload/index.ts` + `src/main/ipc/*`): monta o mesmo objeto `window.api`
 * que o renderer já chama, só que em vez de `ipcRenderer.invoke(...)` cada
 * método chama direto — no mesmo processo, sem IPC — o service/repository
 * correspondente do `src/main`. A UI (`src/renderer`) não sabe a diferença.
 * Ver docs/WEBAPP.md.
 */
import type Database from 'better-sqlite3'
import { getDatabase } from './db/connection'
import { applyWebUpdate, checkWebUpdate, getWebUpdaterStatus, onWebUpdaterStatus } from './updaterWeb'
import { ensureDefaultWorkspace } from '../main/repositories/workspaceRepository'
import { listGroups, updateGroup } from '../main/repositories/groupRepository'
import { createGroup, deleteGroup } from '../main/services/groupService'
import {
  createColumn,
  deleteColumn,
  duplicateColumn,
  listColumns,
  moveColumn,
  reorderColumns,
  updateColumn
} from '../main/services/boardColumnService'
import {
  getCard,
  getWorkspaceIdForCard,
  listAllCardSummariesInWorkspace,
  searchCardsInWorkspace
} from '../main/repositories/cardRepository'
import { createCard, deleteCard, findCardByIdQuery, listCards, updateCard } from '../main/services/cardService'
import { createComment, deleteComment, listCommentsByCard } from '../main/repositories/commentRepository'
import * as attachmentsWeb from './attachmentsWeb'
import {
  getOrCreateNotebook,
  listNotebookVersions,
  restoreNotebookVersion,
  saveNotebook
} from '../main/services/notebookService'
import { createSubtask, deleteSubtask, listSubtasks, updateSubtask } from '../main/services/subtaskService'
import {
  getNotifications,
  getUnreadCount,
  readAllNotifications,
  readNotification
} from '../main/services/notificationService'
import { scanAndBroadcast, onNotificationsChanged } from './notificationScannerWeb'
import { getCalendarItems } from '../main/services/calendarService'
import { listStatusHistoryByCard } from '../main/repositories/statusHistoryRepository'
import { getRunningSession, startTimer, stopTimer } from '../main/services/timerService'
import { listSessionsByCard } from '../main/repositories/studySessionRepository'
import {
  finishCycle,
  getConfig,
  getOpenCycle,
  listCycles,
  startCycle,
  updateConfig
} from '../main/services/pomodoroService'
import { createRelation, deleteRelation, listRelationsForCard } from '../main/repositories/cardRelationRepository'
import { getDashboardSummary } from '../main/services/dashboardService'
import { attachTagToCard, detachTagFromCard, listTagsForCard } from '../main/repositories/tagRepository'
import type {
  AppNotification,
  Attachment,
  BoardColumn,
  CalendarItem,
  Card,
  CardRelation,
  CardRelationView,
  CardSummary,
  Comment,
  CreateBoardColumnInput,
  CreateCardInput,
  CreateCardRelationInput,
  CreateGroupInput,
  CreateSubtaskInput,
  DashboardSummary,
  Group,
  Notebook,
  NotebookVersion,
  Pomodoro,
  PomodoroConfig,
  PomodoroKind,
  SaveNotebookInput,
  SaveNotebookResult,
  StatusHistoryEntry,
  StudySession,
  Subtask,
  Tag,
  UpdateBoardColumnInput,
  UpdateCardInput,
  UpdateGroupInput,
  UpdatePomodoroConfigInput,
  UpdateStatus,
  UpdateSubtaskInput
} from '@shared/types'

const OVERDUE_SCAN_INTERVAL_MS = 60_000
// Hash curto do commit do build corrente (ver vite.web.config.ts) — usado
// como "versão" exibida e como base da checagem de atualização.
const WEB_APP_VERSION = __WEB_BUILD_ID__

async function db(): Promise<Database.Database> {
  return (await getDatabase()) as unknown as Database.Database
}

/** Monta `window.api` e liga o scan periódico de prazo vencido. Chamado uma
 * única vez pelo bootstrap (`web/main.tsx`) antes do primeiro render. */
export async function installWebApi(): Promise<void> {
  const database = await db()
  const workspace = ensureDefaultWorkspace(database)
  scanAndBroadcast(database, workspace.id)
  window.setInterval(() => scanAndBroadcast(database, workspace.id), OVERDUE_SCAN_INTERVAL_MS)

  window.api = {
    app: {
      getInfo: async () => ({ version: WEB_APP_VERSION, workspace: ensureDefaultWorkspace(await db()) })
    },
    groups: {
      list: async (workspaceId) => listGroups(await db(), workspaceId),
      create: async (input) => createGroup(await db(), input),
      update: async (id, patch) => updateGroup(await db(), id, patch),
      delete: async (id) => deleteGroup(await db(), id)
    },
    boardColumns: {
      list: async (groupId) => listColumns(await db(), groupId),
      create: async (input) => createColumn(await db(), input),
      update: async (id, patch) => updateColumn(await db(), id, patch),
      move: async (id, direction) => moveColumn(await db(), id, direction),
      delete: async (id) => deleteColumn(await db(), id),
      reorder: async (groupId, orderedIds) => reorderColumns(await db(), groupId, orderedIds),
      duplicate: async (id) => duplicateColumn(await db(), id)
    },
    cards: {
      listByGroup: async (groupId) => listCards(await db(), groupId),
      get: async (id) => getCard(await db(), id),
      create: async (input) => {
        const database = await db()
        const card = createCard(database, input)
        if (card.dueDate) scanAndBroadcast(database, getWorkspaceIdForCard(database, card.id) ?? '')
        return card
      },
      update: async (id, patch) => {
        const database = await db()
        const card = updateCard(database, id, patch)
        if (patch.dueDate !== undefined || patch.columnId !== undefined) {
          scanAndBroadcast(database, getWorkspaceIdForCard(database, card.id) ?? '')
        }
        return card
      },
      delete: async (id) => deleteCard(await db(), id),
      search: async (workspaceId, query, excludeCardId) =>
        query.trim().length < 2 ? [] : searchCardsInWorkspace(await db(), workspaceId, query.trim(), excludeCardId),
      listAllSummaries: async (workspaceId, excludeCardId) =>
        listAllCardSummariesInWorkspace(await db(), workspaceId, excludeCardId),
      findByIdQuery: async (workspaceId, idQuery) => findCardByIdQuery(await db(), workspaceId, idQuery)
    },
    attachments: {
      listByCard: async (cardId) => attachmentsWeb.listAttachments(await db(), cardId),
      pickAndAdd: async (cardId) => attachmentsWeb.pickAndAddAttachments(await db(), cardId),
      open: async (id) => attachmentsWeb.openAttachment(await db(), id),
      remove: async (id) => attachmentsWeb.removeAttachment(await db(), id),
      addFromBuffer: async (cardId, fileName, data, mimeType) =>
        attachmentsWeb.addAttachmentFromBuffer(await db(), cardId, fileName, data, mimeType)
    },
    notebooks: {
      getByCard: async (cardId) => getOrCreateNotebook(await db(), cardId),
      save: async (input) => saveNotebook(await db(), input.cardId, input.contentMarkdown, input.baseVersion),
      listVersions: async (cardId) => listNotebookVersions(await db(), cardId),
      restoreVersion: async (cardId, version, baseVersion) =>
        restoreNotebookVersion(await db(), cardId, version, baseVersion)
    },
    subtasks: {
      listByCard: async (cardId) => listSubtasks(await db(), cardId),
      create: async (input) => {
        const database = await db()
        const subtask = createSubtask(database, input)
        if (subtask.dueDate) scanAndBroadcast(database, getWorkspaceIdForCard(database, subtask.cardId) ?? '')
        return subtask
      },
      update: async (id, patch) => {
        const database = await db()
        const subtask = updateSubtask(database, id, patch)
        if (patch.dueDate !== undefined || patch.isDone !== undefined) {
          scanAndBroadcast(database, getWorkspaceIdForCard(database, subtask.cardId) ?? '')
        }
        return subtask
      },
      delete: async (id) => deleteSubtask(await db(), id)
    },
    notifications: {
      list: async (workspaceId) => getNotifications(await db(), workspaceId),
      countUnread: async (workspaceId) => getUnreadCount(await db(), workspaceId),
      markRead: async (id) => readNotification(await db(), id),
      markAllRead: async (workspaceId) => readAllNotifications(await db(), workspaceId),
      scanNow: async (workspaceId) => scanAndBroadcast(await db(), workspaceId),
      onChanged: (callback) => onNotificationsChanged(callback)
    },
    calendar: {
      getItems: async (workspaceId) => getCalendarItems(await db(), workspaceId)
    },
    comments: {
      listByCard: async (cardId) => listCommentsByCard(await db(), cardId),
      create: async (cardId, body) => {
        if (!body.trim()) throw new Error('Comentário vazio')
        return createComment(await db(), cardId, body)
      },
      delete: async (id) => deleteComment(await db(), id)
    },
    tags: {
      listForCard: async (cardId) => listTagsForCard(await db(), cardId),
      attachToCard: async (cardId, tagName) => attachTagToCard(await db(), cardId, tagName),
      detachFromCard: async (cardId, tagId) => detachTagFromCard(await db(), cardId, tagId)
    },
    history: {
      listByCard: async (cardId) => listStatusHistoryByCard(await db(), cardId)
    },
    timer: {
      getRunning: async (cardId) => getRunningSession(await db(), cardId),
      start: async (cardId) => startTimer(await db(), cardId),
      stop: async (cardId) => stopTimer(await db(), cardId),
      listByCard: async (cardId) => listSessionsByCard(await db(), cardId)
    },
    pomodoro: {
      getConfig: async (cardId) => getConfig(await db(), cardId),
      updateConfig: async (patch) => updateConfig(await db(), patch),
      getOpenCycle: async (cardId) => getOpenCycle(await db(), cardId),
      startCycle: async (cardId, kind) => startCycle(await db(), cardId, kind),
      finishCycle: async (cardId, pomodoroId, completed) => finishCycle(await db(), cardId, pomodoroId, completed),
      listByCard: async (cardId) => listCycles(await db(), cardId)
    },
    relations: {
      listByCard: async (cardId) => listRelationsForCard(await db(), cardId),
      create: async (input) => createRelation(await db(), input),
      delete: async (id) => deleteRelation(await db(), id)
    },
    dashboard: {
      getSummary: async (workspaceId) => getDashboardSummary(await db(), workspaceId)
    },
    // Sem electron-updater fora do Electron — "atualizar" no build web é
    // comparar o build corrente com o publicado e recarregar. Ver updaterWeb.ts.
    updater: {
      getStatus: async () => getWebUpdaterStatus(),
      check: () => checkWebUpdate(),
      download: async () => applyWebUpdate(),
      install: async () => applyWebUpdate(),
      onStatus: onWebUpdaterStatus
    }
  }
}

// ---- Tipagem de window.api (espelha src/preload/index.ts) ----
export interface WebApi {
  app: { getInfo: () => Promise<{ version: string; workspace: import('@shared/types').Workspace }> }
  groups: {
    list: (workspaceId: string) => Promise<Group[]>
    create: (input: CreateGroupInput) => Promise<Group>
    update: (id: string, patch: UpdateGroupInput) => Promise<Group>
    delete: (id: string) => Promise<void>
  }
  boardColumns: {
    list: (groupId: string) => Promise<BoardColumn[]>
    create: (input: CreateBoardColumnInput) => Promise<BoardColumn>
    update: (id: string, patch: UpdateBoardColumnInput) => Promise<BoardColumn>
    move: (id: string, direction: 'left' | 'right') => Promise<BoardColumn[]>
    delete: (id: string) => Promise<void>
    reorder: (groupId: string, orderedIds: string[]) => Promise<BoardColumn[]>
    duplicate: (id: string) => Promise<BoardColumn>
  }
  cards: {
    listByGroup: (groupId: string) => Promise<Card[]>
    get: (id: string) => Promise<Card | undefined>
    create: (input: CreateCardInput) => Promise<Card>
    update: (id: string, patch: UpdateCardInput) => Promise<Card>
    delete: (id: string) => Promise<void>
    search: (workspaceId: string, query: string, excludeCardId: string) => Promise<CardSummary[]>
    listAllSummaries: (workspaceId: string, excludeCardId: string) => Promise<CardSummary[]>
    findByIdQuery: (workspaceId: string, idQuery: string) => Promise<Card | undefined>
  }
  attachments: {
    listByCard: (cardId: string) => Promise<Attachment[]>
    pickAndAdd: (cardId: string) => Promise<Attachment[]>
    open: (id: string) => Promise<void>
    remove: (id: string) => Promise<void>
    addFromBuffer: (cardId: string, fileName: string, data: ArrayBuffer, mimeType: string) => Promise<Attachment>
  }
  notebooks: {
    getByCard: (cardId: string) => Promise<Notebook>
    save: (input: SaveNotebookInput) => Promise<SaveNotebookResult>
    listVersions: (cardId: string) => Promise<NotebookVersion[]>
    restoreVersion: (cardId: string, version: number, baseVersion: number) => Promise<SaveNotebookResult>
  }
  subtasks: {
    listByCard: (cardId: string) => Promise<Subtask[]>
    create: (input: CreateSubtaskInput) => Promise<Subtask>
    update: (id: string, patch: UpdateSubtaskInput) => Promise<Subtask>
    delete: (id: string) => Promise<void>
  }
  notifications: {
    list: (workspaceId: string) => Promise<AppNotification[]>
    countUnread: (workspaceId: string) => Promise<number>
    markRead: (id: string) => Promise<void>
    markAllRead: (workspaceId: string) => Promise<void>
    scanNow: (workspaceId: string) => Promise<void>
    onChanged: (callback: () => void) => () => void
  }
  calendar: { getItems: (workspaceId: string) => Promise<CalendarItem[]> }
  comments: {
    listByCard: (cardId: string) => Promise<Comment[]>
    create: (cardId: string, body: string) => Promise<Comment>
    delete: (id: string) => Promise<void>
  }
  tags: {
    listForCard: (cardId: string) => Promise<Tag[]>
    attachToCard: (cardId: string, tagName: string) => Promise<Tag[]>
    detachFromCard: (cardId: string, tagId: string) => Promise<Tag[]>
  }
  history: { listByCard: (cardId: string) => Promise<StatusHistoryEntry[]> }
  timer: {
    getRunning: (cardId: string) => Promise<StudySession | undefined>
    start: (cardId: string) => Promise<StudySession>
    stop: (cardId: string) => Promise<{ session: StudySession; card: Card }>
    listByCard: (cardId: string) => Promise<StudySession[]>
  }
  pomodoro: {
    getConfig: (cardId: string) => Promise<PomodoroConfig>
    updateConfig: (patch: UpdatePomodoroConfigInput) => Promise<PomodoroConfig>
    getOpenCycle: (cardId: string) => Promise<Pomodoro | undefined>
    startCycle: (cardId: string, kind: PomodoroKind) => Promise<Pomodoro>
    finishCycle: (cardId: string, pomodoroId: string, completed: boolean) => Promise<Pomodoro>
    listByCard: (cardId: string) => Promise<Pomodoro[]>
  }
  relations: {
    listByCard: (cardId: string) => Promise<CardRelationView[]>
    create: (input: CreateCardRelationInput) => Promise<CardRelation>
    delete: (id: string) => Promise<void>
  }
  dashboard: { getSummary: (workspaceId: string) => Promise<DashboardSummary> }
  updater: {
    getStatus: () => Promise<UpdateStatus>
    check: () => Promise<void>
    download: () => Promise<void>
    install: () => Promise<void>
    onStatus: (callback: (status: UpdateStatus) => void) => () => void
  }
}

declare global {
  interface Window {
    api: WebApi
  }
}
