import { useEffect, useState } from 'react'
import type { AppInfo } from '../../main/ipc/app'

/**
 * Placeholder da Fase 0: apenas confirma que a cadeia renderer -> preload ->
 * ipcMain -> SQLite está funcionando de ponta a ponta (mostra a versão do app
 * e o workspace padrão criado/lido no banco). O Kanban entra na Fase 2.
 */
export default function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.app
      .getInfo()
      .then(setInfo)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  return (
    <main className="app-shell">
      <h1>LearnDeck</h1>
      <p className="subtitle">Gerenciador de estudos — em construção</p>

      {error && <p className="status status--error">Erro ao conectar com o banco: {error}</p>}

      {!error && !info && <p className="status">Conectando ao banco local…</p>}

      {info && (
        <p className="status status--ok">
          Versão {info.version} · workspace &ldquo;{info.workspace.name}&rdquo; carregado com sucesso.
        </p>
      )}
    </main>
  )
}
