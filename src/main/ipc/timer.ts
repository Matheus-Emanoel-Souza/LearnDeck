import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Card, StudySession } from '@shared/types'
import { listSessionsByCard } from '../repositories/studySessionRepository'
import { getRunningSession, startTimer, stopTimer } from '../services/timerService'

export function registerTimerIpc(db: Database.Database): void {
  ipcMain.handle('timer:getRunning', (_event, cardId: string): StudySession | undefined =>
    getRunningSession(db, cardId)
  )

  ipcMain.handle('timer:start', (_event, cardId: string): StudySession => startTimer(db, cardId))

  ipcMain.handle(
    'timer:stop',
    (_event, cardId: string): { session: StudySession; card: Card } => stopTimer(db, cardId)
  )

  ipcMain.handle('timer:listByCard', (_event, cardId: string): StudySession[] =>
    listSessionsByCard(db, cardId)
  )
}
