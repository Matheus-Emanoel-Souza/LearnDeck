import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '@shared/types'

let currentStatus: UpdateStatus = { state: 'idle' }

function setStatus(status: UpdateStatus): void {
  currentStatus = status
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:status', status)
  }
}

export function getUpdaterStatus(): UpdateStatus {
  return currentStatus
}

/**
 * Atualização via internet (GitHub Releases — ver electron-builder.yml > publish).
 * Checa sozinho ao abrir o app (só em build empacotado — sem feed de
 * atualização em desenvolvimento), mas o download só começa quando o usuário
 * pede em Configurações > Sobre & atualizações, clicando em "Atualizar
 * agora" — nada é baixado sem esse clique. autoInstallOnAppQuit garante que,
 * se o usuário já baixou mas não reiniciou na hora, a atualização é aplicada
 * na próxima vez que o app fechar de qualquer jeito.
 */
export function initAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => setStatus({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', (info) => setStatus({ state: 'up-to-date', version: info.version }))
  autoUpdater.on('download-progress', (progress) => {
    const version =
      currentStatus.state === 'available' || currentStatus.state === 'downloading' ? currentStatus.version : ''
    setStatus({ state: 'downloading', version, percent: Math.round(progress.percent) })
  })
  autoUpdater.on('update-downloaded', (info) => setStatus({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (err) => {
    setStatus({ state: 'error', message: err.message || 'Erro desconhecido ao verificar atualizações.' })
  })

  if (!app.isPackaged) {
    setStatus({ state: 'unsupported' })
    return
  }

  autoUpdater.checkForUpdates().catch((err: unknown) => {
    console.error('[updater] falha ao checar atualizações:', err)
  })
}

export async function checkForUpdatesManually(): Promise<void> {
  if (!app.isPackaged) {
    setStatus({ state: 'unsupported' })
    return
  }
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    setStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

export async function downloadUpdateNow(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate()
  } catch (err) {
    setStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

export function installUpdateNow(): void {
  autoUpdater.quitAndInstall()
}
