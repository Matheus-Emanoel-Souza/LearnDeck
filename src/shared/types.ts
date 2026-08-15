/**
 * Tipos compartilhados entre main, preload e renderer.
 * Fonte única de verdade para o formato dos dados trafegados via IPC.
 * Ver docs/database.md para o schema completo por trás desses tipos.
 */

export type CardStatus = 'backlog' | 'to_study' | 'studying' | 'paused' | 'review' | 'done'

export const CARD_STATUSES: CardStatus[] = [
  'backlog',
  'to_study',
  'studying',
  'paused',
  'review',
  'done'
]

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  backlog: 'Backlog',
  to_study: 'A estudar',
  studying: 'Estudando',
  paused: 'Pausado',
  review: 'Revisar',
  done: 'Concluído'
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
  status: CardStatus
  position: number
  totalStudySeconds: number
  pomodorosCompleted: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface StatusHistoryEntry {
  id: string
  cardId: string
  fromStatus: CardStatus | null
  toStatus: CardStatus
  changedAt: string
}

export interface Comment {
  id: string
  cardId: string
  body: string
  createdAt: string
  updatedAt: string
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
  status: CardStatus
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
}

export interface UpdateCardInput {
  title?: string
  description?: string | null
  status?: CardStatus
  position?: number
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

/** Agregados do workspace inteiro para o dashboard. */
export interface DashboardSummary {
  totalCards: number
  openCount: number
  inProgressCount: number
  doneCount: number
  byStatus: Record<CardStatus, number>
  totalStudySeconds: number
  totalPomodoros: number
}
