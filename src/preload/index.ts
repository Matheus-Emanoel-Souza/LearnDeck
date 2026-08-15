import { contextBridge, ipcRenderer } from 'electron'
import type { AppInfo } from '../main/ipc/app'

/**
 * Única porta de entrada do renderer para o mundo Node/main. Nada além do que
 * está exposto aqui é acessível na UI (contextIsolation ligado, sandbox ligado).
 * A tipagem em index.d.ts mantém essa API sincronizada com o que o renderer enxerga.
 */
const api = {
  app: {
    getInfo: (): Promise<AppInfo> => ipcRenderer.invoke('app:getInfo')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
