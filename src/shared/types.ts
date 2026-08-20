/**
 * Tipos compartilhados entre main, preload e renderer.
 * Fonte única de verdade para o formato dos dados trafegados via IPC.
 * Ver docs/database.md para o schema completo por trás desses tipos.
 */

/**
 * Coluna do quadro Kanban (antes um enum fixo de status; agora dado por
 * matéria/grupo, editável pelo usuário — nome, posição e a flag `isDone`, que
 * marca quais colunas contam como "concluído" no dashboard). Cada matéria tem
 * seu próprio conjunto de colunas, independente das outras.
 */
export interface BoardColumn {
  id: string
  groupId: string
  name: string
  position: number
  isDone: boolean
  color: string | null
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  id: string
  name: string
  createdAt: string
}

export interface Group {
  id: string
  workspaceId: string
  parentGroupId: string | null
  name: string
  color: string | null
  position: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Card {
  id: string
  groupId: string
  title: string
  description: string | null
  columnId: string
  position: number
  totalStudySeconds: number
  pomodorosCompleted: number
  /** 'YYYY-MM-DD', opcional. */
  dueDate: string | null
  /** 'HH:MM', opcional — só faz sentido junto de dueDate. */
  dueTime: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Subtarefa de um card: prazo próprio (opcional), independente do prazo do card-pai. */
export interface Subtask {
  id: string
  cardId: string
  title: string
  isDone: boolean
  dueDate: string | null
  dueTime: string | null
  position: number
  createdAt: string
  updatedAt: string
}

export type NotificationKind = 'card' | 'subtask'

/** Notificação de prazo vencido — histórico permanente (não é apagada ao ser lida). */
export interface AppNotification {
  id: string
  workspaceId: string
  kind: NotificationKind
  cardId: string
  subtaskId: string | null
  message: string
  /** ISO datetime do vencimento que gerou o alerta — chave de deduplicação junto com kind/cardId/subtaskId. */
  dueAt: string
  isRead: boolean
  createdAt: string
}

/** Item agregado (card ou subtarefa com prazo) pro calendário. */
export interface CalendarItem {
  id: string
  kind: NotificationKind
  title: string
  dueDate: string
  dueTime: string | null
  isDone: boolean
  cardId: string
  cardTitle: string
  groupId: string
}

/** fromStatus/toStatus guardam o id da coluna no momento da mudança (pode
 * apontar pra uma coluna já excluída — ver docs/database.md). */
export interface StatusHistoryEntry {
  id: string
  cardId: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
}

export interface Comment {
  id: string
  cardId: string
  body: string
  createdAt: string
  updatedAt: string
}

/** Metadados de um arquivo anexado a um card (o arquivo em si fica só no
 * disco local, copiado pro storage do app — ver docs/database.md). */
export interface Attachment {
  id: string
  cardId: string
  fileName: string
  mimeType: string | null
  sizeBytes: number
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string | null
}

export interface StudySession {
  id: string
  cardId: string
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  source: 'manual' | 'pomodoro'
}

export type PomodoroKind = 'focus' | 'short_break' | 'long_break'

export interface PomodoroConfig {
  id: string
  cardId: string | null
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cyclesBeforeLongBreak: number
}

export interface Pomodoro {
  id: string
  cardId: string
  kind: PomodoroKind
  startedAt: string
  endedAt: string | null
  completed: boolean
  studySessionId: string | null
}

export type CardRelationType = 'prerequisite_of' | 'blocks' | 'related_to' | 'part_of'

export const CARD_RELATION_TYPES: CardRelationType[] = [
  'prerequisite_of',
  'blocks',
  'related_to',
  'part_of'
]

export const CARD_RELATION_TYPE_LABELS: Record<CardRelationType, string> = {
  prerequisite_of: 'é pré-requisito de',
  blocks: 'bloqueia',
  related_to: 'relacionado a',
  part_of: 'faz parte de'
}

export interface CardRelation {
  id: string
  cardId: string
  relatedCardId: string
  relationType: CardRelationType
  createdAt: string
}

/** Resumo leve de um card, usado em buscas e listas de relacionamento. */
export interface CardSummary {
  id: string
  groupId: string
  title: string
  columnId: string
}

/** Uma relação já resolvida com os dados do card do outro lado, pronta para exibir. */
export interface CardRelationView {
  id: string
  relationType: CardRelationType
  direction: 'outgoing' | 'incoming'
  createdAt: string
  card: CardSummary
}

// ---- DTOs de entrada usados via IPC (renderer -> main) ----

export interface CreateGroupInput {
  workspaceId: string
  parentGroupId?: string | null
  name: string
  color?: string | null
}

export interface UpdateGroupInput {
  name?: string
  color?: string | null
  parentGroupId?: string | null
  position?: number
}

export interface CreateCardInput {
  groupId: string
  title: string
  description?: string | null
  dueDate?: string | null
  dueTime?: string | null
}

export interface UpdateCardInput {
  title?: string
  description?: string | null
  columnId?: string
  position?: number
  dueDate?: string | null
  dueTime?: string | null
}

export interface CreateSubtaskInput {
  cardId: string
  title: string
  dueDate?: string | null
  dueTime?: string | null
}

export interface UpdateSubtaskInput {
  title?: string
  isDone?: boolean
  dueDate?: string | null
  dueTime?: string | null
  position?: number
}

export interface CreateBoardColumnInput {
  groupId: string
  name: string
}

export interface UpdateBoardColumnInput {
  name?: string
  position?: number
  isDone?: boolean
  color?: string | null
}

export interface UpdatePomodoroConfigInput {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cyclesBeforeLongBreak: number
}

export interface CreateCardRelationInput {
  cardId: string
  relatedCardId: string
  relationType: CardRelationType
}

/**
 * Estado da checagem/atualização do app (electron-updater), espelhado do main
 * pro renderer via IPC — ver src/main/updater.ts e a tela de Configurações.
 */
export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'unsupported' }
  | { state: 'checking' }
  | { state: 'up-to-date'; version: string }
  | { state: 'available'; version: string }
  | { state: 'downloading'; version: string; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

/** Cards abertos (status != done) de uma matéria (grupo raiz) — gráfico de pizza do dashboard. */
export interface SubjectOpenCount {
  groupId: string
  groupName: string
  openCount: number
}

/** Cards criados em um dia — ponto do gráfico de linha "cards abertos ao longo da semana". */
export interface DailyCardCount {
  date: string
  count: number
}

/** Quantos cards (não excluídos) tem em cada coluna do quadro — gráfico de barras do dashboard. */
export interface ColumnCardCount {
  columnId: string
  columnName: string
  count: number
}

/** Agregados do workspace inteiro para o dashboard. */
export interface DashboardSummary {
  totalCards: number
  openCount: number
  doneCount: number
  byColumn: ColumnCardCount[]
  totalStudySeconds: number
  totalPomodoros: number
  openCardsBySubject: SubjectOpenCount[]
  cardsOpenedByDay: DailyCardCount[]
}
