import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

/**
 * Atualização automática via internet (GitHub Releases — ver electron-builder.yml
 * > publish). Em desenvolvimento não há feed de atualização, então isso é
 * ignorado fora de um build empacotado (app.isPackaged).
 *
 * Baixa a atualização em segundo plano assim que detectada; só interrompe o
 * usuário quando o download termina, perguntando se quer reiniciar na hora
 * ou aplicar depois (o instalador aplica sozinho ao fechar o app de qualquer
 * forma, via autoInstallOnAppQuit).
 */
export function initAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (err) => {
    console.error('[updater] erro ao checar/baixar atualização:', err)
  })

  autoUpdater.on('update-downloaded', (info) => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Atualização disponível',
        message: `LearnDeck ${info.version} foi baixado.`,
        detail: 'Reinicie o aplicativo agora para aplicar a atualização, ou deixe para a próxima vez que fechar o app.',
        buttons: ['Reiniciar agora', 'Depois'],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
      .catch((err: unknown) => console.error('[updater] falha ao exibir diálogo:', err))
  })

  autoUpdater.checkForUpdatesAndNotify().catch((err: unknown) => {
    console.error('[updater] falha ao checar atualizações:', err)
  })
}
