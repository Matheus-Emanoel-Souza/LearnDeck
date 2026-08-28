import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupData,
  type BackupFile,
  type BackupImportSummary,
  type CardRelation,
  type CardRelationType,
  type CardTagLink,
  type Comment,
  type PomodoroConfig,
  type StatusHistoryEntry,
  type Subtask
} from '@shared/types'
import { listGroups } from '../repositories/groupRepository'
import { listCardsByGroups } from '../repositories/cardRepository'
import { listBoardColumns } from '../repositories/boardColumnRepository'
import { listSubtasksByCard } from '../repositories/subtaskRepository'
import { listCommentsByCard } from '../repositories/commentRepository'
import { listStatusHistoryByCard } from '../repositories/statusHistoryRepository'
import { listSessionsByCard } from '../repositories/studySessionRepository'
import { listPomodorosByCard } from '../repositories/pomodoroRepository'
import { listTagsForCard } from '../repositories/tagRepository'
import { getNotebookByCard, listVersions as listNotebookVersions } from '../repositories/notebookRepository'

/**
 * Backup completo do workspace: exporta/importa tudo em um único JSON,
 * reaproveitando as MESMAS tabelas SQLite de sempre (via `db`) — não existe
 * um segundo armazenamento paralelo, só leitura/escrita direta nas tabelas
 * que os repositórios de `src/main/repositories` já usam. Roda igual nos
 * dois builds (desktop via better-sqlite3, web via o adaptador sql.js — ver
 * docs/WEBAPP.md), porque só depende da mesma interface `db.prepare/transaction`
 * que todo o resto do `src/main` já usa.
 *
 * Fora do escopo desta v1, deliberadamente:
 * - Conteúdo binário de anexos (arquivo no disco no desktop, Blob no
 *   IndexedDB no web — formatos incompatíveis entre si e caros de inline em
 *   JSON). Anexos não entram no backup nem nos metadados, pra não recriar
 *   registros que apontam pra um arquivo que não existe no destino.
 * - Config global de Pomodoro (é preferência do app, não dado de projeto).
 * - `notifications` (derivadas dos prazos, recriadas sozinhas pelo scanner).
 */

// ---- Export ----

interface CardRelationRow {
  id: string
  card_id: string
  related_card_id: string
  relation_type: CardRelationType
  created_at: string
}

function listOutgoingRelations(db: Database.Database, cardId: string): CardRelation[] {
  const rows = db.prepare('SELECT * FROM card_relations WHERE card_id = ?').all(cardId) as CardRelationRow[]
  return rows.map((row) => ({
    id: row.id,
    cardId: row.card_id,
    relatedCardId: row.related_card_id,
    relationType: row.relation_type,
    createdAt: row.created_at
  }))
}

interface PomodoroConfigRow {
  id: string
  card_id: string | null
  focus_minutes: number
  short_break_minutes: number
  long_break_minutes: number
  cycles_before_long_break: number
}

/** Só o override específico do card, se existir — a config global fica de fora do backup. */
function getCardPomodoroConfig(db: Database.Database, cardId: string): PomodoroConfig | undefined {
  const row = db.prepare('SELECT * FROM pomodoro_configs WHERE card_id = ?').get(cardId) as
    | PomodoroConfigRow
    | undefined
  if (!row || row.card_id === null) return undefined
  return {
    id: row.id,
    cardId: row.card_id,
    focusMinutes: row.focus_minutes,
    shortBreakMinutes: row.short_break_minutes,
    longBreakMinutes: row.long_break_minutes,
    cyclesBeforeLongBreak: row.cycles_before_long_break
  }
}

export function exportBackup(db: Database.Database, workspaceId: string): BackupFile {
  const groups = listGroups(db, workspaceId)
  const groupIds = groups.map((g) => g.id)

  const boardColumns = groupIds.flatMap((groupId) => listBoardColumns(db, groupId))

  const cards = listCardsByGroups(db, groupIds)
  const cardIds = new Set(cards.map((c) => c.id))

  const data: BackupData = {
    groups,
    boardColumns,
    cards,
    subtasks: [],
    comments: [],
    cardRelations: [],
    statusHistory: [],
    studySessions: [],
    pomodoroConfigs: [],
    pomodoros: [],
    tags: [],
    cardTags: [],
    notebooks: [],
    notebookVersions: []
  }

  const tagsById = new Map<string, BackupData['tags'][number]>()

  for (const card of cards) {
    data.subtasks.push(...listSubtasksByCard(db, card.id))
    data.comments.push(...listCommentsByCard(db, card.id))
    data.statusHistory.push(...listStatusHistoryByCard(db, card.id))
    data.studySessions.push(...listSessionsByCard(db, card.id))
    data.pomodoros.push(...listPomodorosByCard(db, card.id))

    const cardConfig = getCardPomodoroConfig(db, card.id)
    if (cardConfig) data.pomodoroConfigs.push(cardConfig)

    // Só mantém a relação se as duas pontas estiverem no conjunto exportado
    // (evita referência pra um card de fora do escopo, ex.: já excluído).
    for (const relation of listOutgoingRelations(db, card.id)) {
      if (cardIds.has(relation.relatedCardId)) data.cardRelations.push(relation)
    }

    for (const tag of listTagsForCard(db, card.id)) {
      tagsById.set(tag.id, tag)
      data.cardTags.push({ cardId: card.id, tagId: tag.id })
    }

    const notebook = getNotebookByCard(db, card.id)
    if (notebook) {
      data.notebooks.push(notebook)
      data.notebookVersions.push(...listNotebookVersions(db, notebook.id))
    }
  }

  data.tags = [...tagsById.values()]

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data
  }
}

// ---- Validação ----

function fail(message: string): never {
  throw new Error(`Backup inválido: ${message}`)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isStr = (v: unknown): v is string => typeof v === 'string'
const isStrOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

function asArray(container: Record<string, unknown>, field: string): unknown[] {
  const value = container[field]
  if (!Array.isArray(value)) fail(`campo "data.${field}" ausente ou não é uma lista.`)
  return value as unknown[]
}

function requireStr(item: Record<string, unknown>, field: string, where: string): string {
  const value = item[field]
  if (!isStr(value) || value.length === 0) fail(`item de "${where}" com campo "${field}" inválido.`)
  return value
}

const RELATION_TYPES: CardRelationType[] = ['prerequisite_of', 'blocks', 'related_to', 'part_of']
const POMODORO_KINDS = ['focus', 'short_break', 'long_break']
const STUDY_SOURCES = ['manual', 'pomodoro']

/**
 * Valida a estrutura inteira (formato/versão, tipos de cada campo e
 * integridade referencial entre as listas) ANTES de qualquer escrita no
 * banco — se alguma coisa aqui falhar, `importBackup` nunca chega a abrir a
 * transação, então nenhum dado existente é tocado.
 */
export function validateBackup(raw: unknown): BackupFile {
  if (!isPlainObject(raw)) fail('o arquivo não contém um objeto JSON.')
  if (raw.format !== BACKUP_FORMAT) fail('o arquivo não é um backup do LearnDeck.')
  if (!isNum(raw.version)) fail('campo de versão ausente ou inválido.')
  if (raw.version !== BACKUP_VERSION) {
    fail(`versão de backup não suportada (${String(raw.version)}) — atualize o LearnDeck para importar este arquivo.`)
  }
  if (!isStr(raw.createdAt)) fail('campo "createdAt" ausente ou inválido.')
  if (!isPlainObject(raw.data)) fail('campo "data" ausente.')

  const container = raw.data

  const groupsRaw = asArray(container, 'groups')
  const boardColumnsRaw = asArray(container, 'boardColumns')
  const cardsRaw = asArray(container, 'cards')
  const subtasksRaw = asArray(container, 'subtasks')
  const commentsRaw = asArray(container, 'comments')
  const cardRelationsRaw = asArray(container, 'cardRelations')
  const statusHistoryRaw = asArray(container, 'statusHistory')
  const studySessionsRaw = asArray(container, 'studySessions')
  const pomodoroConfigsRaw = asArray(container, 'pomodoroConfigs')
  const pomodorosRaw = asArray(container, 'pomodoros')
  const tagsRaw = asArray(container, 'tags')
  const cardTagsRaw = asArray(container, 'cardTags')
  const notebooksRaw = asArray(container, 'notebooks')
  const notebookVersionsRaw = asArray(container, 'notebookVersions')

  const data: BackupData = {
    groups: [],
    boardColumns: [],
    cards: [],
    subtasks: [],
    comments: [],
    cardRelations: [],
    statusHistory: [],
    studySessions: [],
    pomodoroConfigs: [],
    pomodoros: [],
    tags: [],
    cardTags: [],
    notebooks: [],
    notebookVersions: []
  }

  const groupIds = new Set<string>()
  for (const item of groupsRaw) {
    if (!isPlainObject(item)) fail('item de "groups" não é um objeto.')
    const id = requireStr(item, 'id', 'groups')
    if (groupIds.has(id)) fail(`matéria duplicada no backup (id ${id}).`)
    groupIds.add(id)
    data.groups.push({
      id,
      workspaceId: requireStr(item, 'workspaceId', 'groups'),
      parentGroupId: isStrOrNull(item.parentGroupId) ? item.parentGroupId : null,
      name: requireStr(item, 'name', 'groups'),
      color: isStrOrNull(item.color) ? item.color : null,
      position: isNum(item.position) ? item.position : 0,
      createdAt: requireStr(item, 'createdAt', 'groups'),
      updatedAt: requireStr(item, 'updatedAt', 'groups'),
      deletedAt: null
    })
  }
  for (const g of data.groups) {
    if (g.parentGroupId !== null && !groupIds.has(g.parentGroupId)) {
      fail(`matéria "${g.name}" referencia uma matéria-pai que não está no backup.`)
    }
  }

  const columnIds = new Set<string>()
  for (const item of boardColumnsRaw) {
    if (!isPlainObject(item)) fail('item de "boardColumns" não é um objeto.')
    const id = requireStr(item, 'id', 'boardColumns')
    const groupId = requireStr(item, 'groupId', 'boardColumns')
    if (!groupIds.has(groupId)) fail(`coluna "${String(item.name)}" referencia uma matéria fora do backup.`)
    columnIds.add(id)
    data.boardColumns.push({
      id,
      groupId,
      name: requireStr(item, 'name', 'boardColumns'),
      position: isNum(item.position) ? item.position : 0,
      isDone: isBool(item.isDone) ? item.isDone : false,
      color: isStrOrNull(item.color) ? item.color : null,
      createdAt: requireStr(item, 'createdAt', 'boardColumns'),
      updatedAt: requireStr(item, 'updatedAt', 'boardColumns')
    })
  }

  const cardIds = new Set<string>()
  for (const item of cardsRaw) {
    if (!isPlainObject(item)) fail('item de "cards" não é um objeto.')
    const id = requireStr(item, 'id', 'cards')
    const groupId = requireStr(item, 'groupId', 'cards')
    const columnId = requireStr(item, 'columnId', 'cards')
    if (!groupIds.has(groupId)) fail(`ticket "${String(item.title)}" referencia uma matéria fora do backup.`)
    if (!columnIds.has(columnId)) fail(`ticket "${String(item.title)}" referencia uma coluna fora do backup.`)
    cardIds.add(id)
    data.cards.push({
      id,
      groupId,
      title: requireStr(item, 'title', 'cards'),
      description: isStrOrNull(item.description) ? item.description : null,
      columnId,
      position: isNum(item.position) ? item.position : 0,
      totalStudySeconds: isNum(item.totalStudySeconds) ? item.totalStudySeconds : 0,
      pomodorosCompleted: isNum(item.pomodorosCompleted) ? item.pomodorosCompleted : 0,
      dueDate: isStrOrNull(item.dueDate) ? item.dueDate : null,
      dueTime: isStrOrNull(item.dueTime) ? item.dueTime : null,
      createdAt: requireStr(item, 'createdAt', 'cards'),
      updatedAt: requireStr(item, 'updatedAt', 'cards'),
      deletedAt: null
    })
  }

  function requireCardId(item: Record<string, unknown>, where: string): string {
    const cardId = requireStr(item, 'cardId', where)
    if (!cardIds.has(cardId)) fail(`item de "${where}" referencia um ticket fora do backup.`)
    return cardId
  }

  for (const item of subtasksRaw) {
    if (!isPlainObject(item)) fail('item de "subtasks" não é um objeto.')
    const cardId = requireCardId(item, 'subtasks')
    const subtask: Subtask = {
      id: requireStr(item, 'id', 'subtasks'),
      cardId,
      title: requireStr(item, 'title', 'subtasks'),
      isDone: isBool(item.isDone) ? item.isDone : false,
      dueDate: isStrOrNull(item.dueDate) ? item.dueDate : null,
      dueTime: isStrOrNull(item.dueTime) ? item.dueTime : null,
      position: isNum(item.position) ? item.position : 0,
      createdAt: requireStr(item, 'createdAt', 'subtasks'),
      updatedAt: requireStr(item, 'updatedAt', 'subtasks')
    }
    data.subtasks.push(subtask)
  }

  for (const item of commentsRaw) {
    if (!isPlainObject(item)) fail('item de "comments" não é um objeto.')
    const cardId = requireCardId(item, 'comments')
    const comment: Comment = {
      id: requireStr(item, 'id', 'comments'),
      cardId,
      body: requireStr(item, 'body', 'comments'),
      createdAt: requireStr(item, 'createdAt', 'comments'),
      updatedAt: requireStr(item, 'updatedAt', 'comments')
    }
    data.comments.push(comment)
  }

  for (const item of cardRelationsRaw) {
    if (!isPlainObject(item)) fail('item de "cardRelations" não é um objeto.')
    const cardId = requireCardId(item, 'cardRelations')
    const relatedCardId = requireStr(item, 'relatedCardId', 'cardRelations')
    if (!cardIds.has(relatedCardId)) fail('relação entre tickets referencia um ticket fora do backup.')
    const relationType = item.relationType
    if (typeof relationType !== 'string' || !RELATION_TYPES.includes(relationType as CardRelationType)) {
      fail('relação entre tickets com tipo inválido.')
    }
    data.cardRelations.push({
      id: requireStr(item, 'id', 'cardRelations'),
      cardId,
      relatedCardId,
      relationType: relationType as CardRelationType,
      createdAt: requireStr(item, 'createdAt', 'cardRelations')
    })
  }

  // fromStatus/toStatus podem legitimamente apontar pra uma coluna já
  // excluída (fora do backup) — o próprio app já tolera isso hoje (ver
  // docs/database.md), então não valida contra o conjunto de colunas.
  for (const item of statusHistoryRaw) {
    if (!isPlainObject(item)) fail('item de "statusHistory" não é um objeto.')
    const cardId = requireCardId(item, 'statusHistory')
    const entry: StatusHistoryEntry = {
      id: requireStr(item, 'id', 'statusHistory'),
      cardId,
      fromStatus: isStrOrNull(item.fromStatus) ? item.fromStatus : null,
      toStatus: requireStr(item, 'toStatus', 'statusHistory'),
      changedAt: requireStr(item, 'changedAt', 'statusHistory')
    }
    data.statusHistory.push(entry)
  }

  const studySessionIds = new Set<string>()
  for (const item of studySessionsRaw) {
    if (!isPlainObject(item)) fail('item de "studySessions" não é um objeto.')
    const cardId = requireCardId(item, 'studySessions')
    const source = item.source
    if (typeof source !== 'string' || !STUDY_SOURCES.includes(source)) {
      fail('sessão de estudo com origem inválida.')
    }
    const id = requireStr(item, 'id', 'studySessions')
    studySessionIds.add(id)
    data.studySessions.push({
      id,
      cardId,
      startedAt: requireStr(item, 'startedAt', 'studySessions'),
      endedAt: isStrOrNull(item.endedAt) ? item.endedAt : null,
      durationSeconds: item.durationSeconds === null ? null : isNum(item.durationSeconds) ? item.durationSeconds : null,
      source: source as 'manual' | 'pomodoro'
    })
  }

  for (const item of pomodoroConfigsRaw) {
    if (!isPlainObject(item)) fail('item de "pomodoroConfigs" não é um objeto.')
    const cardId = requireCardId(item, 'pomodoroConfigs')
    const config: PomodoroConfig = {
      id: requireStr(item, 'id', 'pomodoroConfigs'),
      cardId,
      focusMinutes: isNum(item.focusMinutes) ? item.focusMinutes : 25,
      shortBreakMinutes: isNum(item.shortBreakMinutes) ? item.shortBreakMinutes : 5,
      longBreakMinutes: isNum(item.longBreakMinutes) ? item.longBreakMinutes : 15,
      cyclesBeforeLongBreak: isNum(item.cyclesBeforeLongBreak) ? item.cyclesBeforeLongBreak : 4
    }
    data.pomodoroConfigs.push(config)
  }

  for (const item of pomodorosRaw) {
    if (!isPlainObject(item)) fail('item de "pomodoros" não é um objeto.')
    const cardId = requireCardId(item, 'pomodoros')
    const kind = item.kind
    if (typeof kind !== 'string' || !POMODORO_KINDS.includes(kind)) fail('ciclo de pomodoro com tipo inválido.')
    const studySessionId = isStrOrNull(item.studySessionId) ? item.studySessionId : null
    if (studySessionId !== null && !studySessionIds.has(studySessionId)) {
      fail('ciclo de pomodoro referencia uma sessão de estudo fora do backup.')
    }
    data.pomodoros.push({
      id: requireStr(item, 'id', 'pomodoros'),
      cardId,
      kind: kind as 'focus' | 'short_break' | 'long_break',
      startedAt: requireStr(item, 'startedAt', 'pomodoros'),
      endedAt: isStrOrNull(item.endedAt) ? item.endedAt : null,
      completed: isBool(item.completed) ? item.completed : false,
      studySessionId
    })
  }

  const tagIds = new Set<string>()
  for (const item of tagsRaw) {
    if (!isPlainObject(item)) fail('item de "tags" não é um objeto.')
    const id = requireStr(item, 'id', 'tags')
    tagIds.add(id)
    data.tags.push({
      id,
      name: requireStr(item, 'name', 'tags'),
      color: isStrOrNull(item.color) ? item.color : null
    })
  }

  for (const item of cardTagsRaw) {
    if (!isPlainObject(item)) fail('item de "cardTags" não é um objeto.')
    const cardId = requireCardId(item, 'cardTags')
    const tagId = requireStr(item, 'tagId', 'cardTags')
    if (!tagIds.has(tagId)) fail('vínculo de tag referencia uma tag fora do backup.')
    const link: CardTagLink = { cardId, tagId }
    data.cardTags.push(link)
  }

  const notebookIds = new Set<string>()
  for (const item of notebooksRaw) {
    if (!isPlainObject(item)) fail('item de "notebooks" não é um objeto.')
    const cardId = requireCardId(item, 'notebooks')
    const id = requireStr(item, 'id', 'notebooks')
    notebookIds.add(id)
    data.notebooks.push({
      id,
      cardId,
      contentMarkdown: isStr(item.contentMarkdown) ? item.contentMarkdown : '',
      version: isNum(item.version) ? item.version : 1,
      createdAt: requireStr(item, 'createdAt', 'notebooks'),
      updatedAt: requireStr(item, 'updatedAt', 'notebooks')
    })
  }

  for (const item of notebookVersionsRaw) {
    if (!isPlainObject(item)) fail('item de "notebookVersions" não é um objeto.')
    const notebookId = requireStr(item, 'notebookId', 'notebookVersions')
    if (!notebookIds.has(notebookId)) fail('versão de caderno referencia um caderno fora do backup.')
    data.notebookVersions.push({
      id: requireStr(item, 'id', 'notebookVersions'),
      notebookId,
      version: isNum(item.version) ? item.version : 1,
      contentMarkdown: isStr(item.contentMarkdown) ? item.contentMarkdown : '',
      createdAt: requireStr(item, 'createdAt', 'notebookVersions')
    })
  }

  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: raw.createdAt, data }
}

// ---- Import ----

/**
 * Importa um backup já validado como dados NOVOS, sempre — nunca sobrescreve
 * nada que já existe localmente. Todo id (matéria, coluna, ticket, caderno,
 * sessão de estudo) ganha um UUID novo aqui dentro, com um mapa
 * id-do-backup -> id-novo para reescrever as referências entre as tabelas;
 * datas de criação/edição originais são preservadas. Tudo roda em uma única
 * transação: se qualquer INSERT falhar no meio, nada fica gravado (ver
 * SqljsDatabaseAdapter.transaction / better-sqlite3.transaction).
 */
export function importBackup(db: Database.Database, workspaceId: string, raw: unknown): BackupImportSummary {
  const backup = validateBackup(raw)
  const { data } = backup

  const run = db.transaction((): BackupImportSummary => {
    const groupIdMap = new Map<string, string>()
    const columnIdMap = new Map<string, string>()
    const cardIdMap = new Map<string, string>()
    const studySessionIdMap = new Map<string, string>()
    const notebookIdMap = new Map<string, string>()
    const tagIdMap = new Map<string, string>()

    // 1) groups — insere pai antes de filho (hierarquia arbitrária).
    const pending = [...data.groups]
    while (pending.length > 0) {
      const before = pending.length
      for (let i = pending.length - 1; i >= 0; i--) {
        const g = pending[i]
        if (g.parentGroupId !== null && !groupIdMap.has(g.parentGroupId)) continue

        const newId = randomUUID()
        groupIdMap.set(g.id, newId)
        db.prepare(
          `INSERT INTO groups (id, workspace_id, parent_group_id, name, color, position, created_at, updated_at, deleted_at)
           VALUES (@id, @workspace_id, @parent_group_id, @name, @color, @position, @created_at, @updated_at, NULL)`
        ).run({
          id: newId,
          workspace_id: workspaceId,
          parent_group_id: g.parentGroupId ? (groupIdMap.get(g.parentGroupId) ?? null) : null,
          name: g.name,
          color: g.color,
          position: g.position,
          created_at: g.createdAt,
          updated_at: g.updatedAt
        })
        pending.splice(i, 1)
      }
      // Já validado sem ciclos/pai ausente — se nada avançou, é um bug aqui, não do usuário.
      if (pending.length === before) fail('hierarquia de matérias não pôde ser reconstruída.')
    }

    // 2) boardColumns
    for (const col of data.boardColumns) {
      const newId = randomUUID()
      columnIdMap.set(col.id, newId)
      db.prepare(
        `INSERT INTO board_columns (id, group_id, name, position, is_done, color, created_at, updated_at)
         VALUES (@id, @group_id, @name, @position, @is_done, @color, @created_at, @updated_at)`
      ).run({
        id: newId,
        group_id: groupIdMap.get(col.groupId),
        name: col.name,
        position: col.position,
        is_done: col.isDone ? 1 : 0,
        color: col.color,
        created_at: col.createdAt,
        updated_at: col.updatedAt
      })
    }

    // 3) cards
    for (const card of data.cards) {
      const newId = randomUUID()
      cardIdMap.set(card.id, newId)
      db.prepare(
        `INSERT INTO cards (id, group_id, title, description, column_id, position, total_study_seconds,
           pomodoros_completed, due_date, due_time, created_at, updated_at, deleted_at)
         VALUES (@id, @group_id, @title, @description, @column_id, @position, @total_study_seconds,
           @pomodoros_completed, @due_date, @due_time, @created_at, @updated_at, NULL)`
      ).run({
        id: newId,
        group_id: groupIdMap.get(card.groupId),
        title: card.title,
        description: card.description,
        column_id: columnIdMap.get(card.columnId),
        position: card.position,
        total_study_seconds: card.totalStudySeconds,
        pomodoros_completed: card.pomodorosCompleted,
        due_date: card.dueDate,
        due_time: card.dueTime,
        created_at: card.createdAt,
        updated_at: card.updatedAt
      })
    }

    // 4) subtasks
    for (const s of data.subtasks) {
      db.prepare(
        `INSERT INTO subtasks (id, card_id, title, is_done, due_date, due_time, position, created_at, updated_at)
         VALUES (@id, @card_id, @title, @is_done, @due_date, @due_time, @position, @created_at, @updated_at)`
      ).run({
        id: randomUUID(),
        card_id: cardIdMap.get(s.cardId),
        title: s.title,
        is_done: s.isDone ? 1 : 0,
        due_date: s.dueDate,
        due_time: s.dueTime,
        position: s.position,
        created_at: s.createdAt,
        updated_at: s.updatedAt
      })
    }

    // 5) comments
    for (const c of data.comments) {
      db.prepare(
        `INSERT INTO comments (id, card_id, body, created_at, updated_at)
         VALUES (@id, @card_id, @body, @created_at, @updated_at)`
      ).run({
        id: randomUUID(),
        card_id: cardIdMap.get(c.cardId),
        body: c.body,
        created_at: c.createdAt,
        updated_at: c.updatedAt
      })
    }

    // 6) statusHistory — remapeia from/to quando a coluna também veio no
    //    backup; quando não (coluna já excluída na origem), mantém o id
    //    original — mesma tolerância que o app já tem hoje (docs/database.md).
    for (const h of data.statusHistory) {
      db.prepare(
        `INSERT INTO status_history (id, card_id, from_status, to_status, changed_at)
         VALUES (@id, @card_id, @from_status, @to_status, @changed_at)`
      ).run({
        id: randomUUID(),
        card_id: cardIdMap.get(h.cardId),
        from_status: h.fromStatus ? (columnIdMap.get(h.fromStatus) ?? h.fromStatus) : null,
        to_status: columnIdMap.get(h.toStatus) ?? h.toStatus,
        changed_at: h.changedAt
      })
    }

    // 7) studySessions (antes de pomodoros, que podem referenciar uma)
    for (const s of data.studySessions) {
      const newId = randomUUID()
      studySessionIdMap.set(s.id, newId)
      db.prepare(
        `INSERT INTO study_sessions (id, card_id, started_at, ended_at, duration_seconds, source)
         VALUES (@id, @card_id, @started_at, @ended_at, @duration_seconds, @source)`
      ).run({
        id: newId,
        card_id: cardIdMap.get(s.cardId),
        started_at: s.startedAt,
        ended_at: s.endedAt,
        duration_seconds: s.durationSeconds,
        source: s.source
      })
    }

    // 8) pomodoroConfigs (só overrides por card — validateBackup já garante
    //    cardId preenchido; o guard abaixo só estreita o tipo pro TS)
    for (const p of data.pomodoroConfigs) {
      if (!p.cardId) continue
      db.prepare(
        `INSERT INTO pomodoro_configs (id, card_id, focus_minutes, short_break_minutes, long_break_minutes, cycles_before_long_break)
         VALUES (@id, @card_id, @focus_minutes, @short_break_minutes, @long_break_minutes, @cycles_before_long_break)`
      ).run({
        id: randomUUID(),
        card_id: cardIdMap.get(p.cardId),
        focus_minutes: p.focusMinutes,
        short_break_minutes: p.shortBreakMinutes,
        long_break_minutes: p.longBreakMinutes,
        cycles_before_long_break: p.cyclesBeforeLongBreak
      })
    }

    // 9) pomodoros
    for (const p of data.pomodoros) {
      db.prepare(
        `INSERT INTO pomodoros (id, card_id, kind, started_at, ended_at, completed, study_session_id)
         VALUES (@id, @card_id, @kind, @started_at, @ended_at, @completed, @study_session_id)`
      ).run({
        id: randomUUID(),
        card_id: cardIdMap.get(p.cardId),
        kind: p.kind,
        started_at: p.startedAt,
        ended_at: p.endedAt,
        completed: p.completed ? 1 : 0,
        study_session_id: p.studySessionId ? (studySessionIdMap.get(p.studySessionId) ?? null) : null
      })
    }

    // 10) cardRelations — OR IGNORE: mesma tolerância a duplicata que createRelation() já usa.
    for (const r of data.cardRelations) {
      db.prepare(
        `INSERT OR IGNORE INTO card_relations (id, card_id, related_card_id, relation_type, created_at)
         VALUES (@id, @card_id, @related_card_id, @relation_type, @created_at)`
      ).run({
        id: randomUUID(),
        card_id: cardIdMap.get(r.cardId),
        related_card_id: cardIdMap.get(r.relatedCardId),
        relation_type: r.relationType,
        created_at: r.createdAt
      })
    }

    // 11) tags — encontra por nome (evita duplicar tag já existente) ou cria.
    for (const t of data.tags) {
      const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(t.name) as { id: string } | undefined
      if (existing) {
        tagIdMap.set(t.id, existing.id)
      } else {
        const newId = randomUUID()
        db.prepare('INSERT INTO tags (id, name, color) VALUES (@id, @name, @color)').run({
          id: newId,
          name: t.name,
          color: t.color
        })
        tagIdMap.set(t.id, newId)
      }
    }

    // 12) cardTags
    for (const link of data.cardTags) {
      db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)').run(
        cardIdMap.get(link.cardId),
        tagIdMap.get(link.tagId)
      )
    }

    // 13) notebooks
    for (const n of data.notebooks) {
      const newId = randomUUID()
      notebookIdMap.set(n.id, newId)
      db.prepare(
        `INSERT INTO notebooks (id, card_id, content_markdown, version, created_at, updated_at)
         VALUES (@id, @card_id, @content_markdown, @version, @created_at, @updated_at)`
      ).run({
        id: newId,
        card_id: cardIdMap.get(n.cardId),
        content_markdown: n.contentMarkdown,
        version: n.version,
        created_at: n.createdAt,
        updated_at: n.updatedAt
      })
    }

    // 14) notebookVersions
    for (const v of data.notebookVersions) {
      db.prepare(
        `INSERT INTO notebook_versions (id, notebook_id, version, content_markdown, created_at)
         VALUES (@id, @notebook_id, @version, @content_markdown, @created_at)`
      ).run({
        id: randomUUID(),
        notebook_id: notebookIdMap.get(v.notebookId),
        version: v.version,
        content_markdown: v.contentMarkdown,
        created_at: v.createdAt
      })
    }

    return { groups: data.groups.length, cards: data.cards.length }
  })

  try {
    return run()
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Backup inválido')) throw err
    throw new Error(`Não foi possível importar o backup: ${err instanceof Error ? err.message : String(err)}`)
  }
}
