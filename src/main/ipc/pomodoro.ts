import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Pomodoro, PomodoroConfig, PomodoroKind, UpdatePomodoroConfigInput } from '@shared/types'
import {
  finishCycle,
  getConfig,
  getOpenCycle,
  listCycles,
  startCycle,
  updateConfig
} from '../services/pomodoroService'

export function registerPomodoroIpc(db: Database.Database): void {
  ipcMain.handle('pomodoro:getConfig', (_event, cardId: string): PomodoroConfig => getConfig(db, cardId))

  ipcMain.handle(
    'pomodoro:updateConfig',
    (_event, patch: UpdatePomodoroConfigInput): PomodoroConfig => updateConfig(db, patch)
  )

  ipcMain.handle('pomodoro:getOpenCycle', (_event, cardId: string): Pomodoro | undefined =>
    getOpenCycle(db, cardId)
  )

  ipcMain.handle(
    'pomodoro:startCycle',
    (_event, cardId: string, kind: PomodoroKind): Pomodoro => startCycle(db, cardId, kind)
  )

  ipcMain.handle(
    'pomodoro:finishCycle',
    (_event, cardId: string, pomodoroId: string, completed: boolean): Pomodoro =>
      finishCycle(db, cardId, pomodoroId, completed)
  )

  ipcMain.handle('pomodoro:listByCard', (_event, cardId: string): Pomodoro[] => listCycles(db, cardId))
}
