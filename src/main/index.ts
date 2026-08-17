import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { getDatabase, closeDatabase } from './db/connection'
import { runMigrations } from './db/migrate'
import { registerAppIpc } from './ipc/app'
import { registerGroupsIpc } from './ipc/groups'
import { registerBoardColumnsIpc } from './ipc/boardColumns'
import { registerCardsIpc } from './ipc/cards'
import { registerCommentsIpc } from './ipc/comments'
import { registerAttachmentsIpc } from './ipc/attachments'
import { registerTagsIpc } from './ipc/tags'
import { registerHistoryIpc } from './ipc/history'
import { registerTimerIpc } from './ipc/timer'
import { registerPomodoroIpc } from './ipc/pomodoro'
import { registerRelationsIpc } from './ipc/relations'
import { registerDashboardIpc } from './ipc/dashboard'
import { registerSubtasksIpc } from './ipc/subtasks'
import { registerNotificationsIpc } from './ipc/notifications'
import { registerCalendarIpc } from './ipc/calendar'
import { registerUpdaterIpc } from './ipc/updater'
import { initAutoUpdater } from './updater'
import { ensureDefaultWorkspace } from './repositories/workspaceRepository'
import { scanAndBroadcast } from './notificationScanner'

const OVERDUE_SCAN_INTERVAL_MS = 60_000

const isDev = !app.isPackaged

function createMainWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())

  // Links externos abrem no navegador do sistema, nunca dentro do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const db = getDatabase()
  runMigrations(db)
  registerAppIpc(db)
  registerGroupsIpc(db)
  registerBoardColumnsIpc(db)
  registerCardsIpc(db)
  registerCommentsIpc(db)
  registerAttachmentsIpc(db)
  registerTagsIpc(db)
  registerHistoryIpc(db)
  registerTimerIpc(db)
  registerPomodoroIpc(db)
  registerRelationsIpc(db)
  registerDashboardIpc(db)
  registerSubtasksIpc(db)
  registerNotificationsIpc(db)
  registerCalendarIpc(db)
  registerUpdaterIpc()

  createMainWindow()
  initAutoUpdater()

  // Scan de prazos vencidos: uma vez no boot (cobre o tempo em que o app
  // ficou fechado) e depois a cada minuto — ver src/main/notificationScanner.ts.
  const workspace = ensureDefaultWorkspace(db)
  scanAndBroadcast(db, workspace.id)
  setInterval(() => scanAndBroadcast(db, workspace.id), OVERDUE_SCAN_INTERVAL_MS)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})
