import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@renderer/App'
import { applyTheme, getInitialTheme } from '@renderer/lib/theme'
import '@renderer/styles/global.css'
import { installWebApi } from './api'
import { flushPendingWrite } from './db/connection'

// Marca o build web ANTES de qualquer componente montar — ver
// src/renderer/src/lib/platform.ts (usado pelo caderno pra resolver imagens).
;(window as unknown as { __LEARNDECK_WEB__: boolean }).__LEARNDECK_WEB__ = true

applyTheme(getInitialTheme())

// Garante que a última escrita pendente (debounce de 400ms, ver db/connection.ts)
// não se perde se o usuário fechar a aba logo em seguida.
window.addEventListener('beforeunload', flushPendingWrite)

installWebApi()
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
  .catch((err: unknown) => {
    const root = document.getElementById('root')
    if (root) {
      root.textContent =
        'Não foi possível iniciar o LearnDeck neste navegador: ' + (err instanceof Error ? err.message : String(err))
    }
    console.error(err)
  })

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
