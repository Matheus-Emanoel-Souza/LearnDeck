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

export interface CardRelation {
  id: string
  cardId: string
  relatedCardId: string
  relationType: CardRelationType
  createdAt: string
}
