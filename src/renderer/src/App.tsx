import { useEffect, useState } from 'react'
import type { AppInfo } from '../../main/ipc/app'
import StudyPanel from './pages/StudyPanel'

export default function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.app
      .getInfo()
      .then(setInfo)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  if (error) {
    return (
      <main className="app-shell">
        <h1>LearnDeck</h1>
        <p className="status status--error">Erro ao conectar com o banco: {error}</p>
      </main>
    )
  }

  if (!info) {
    return (
      <main className="app-shell">
        <h1>LearnDeck</h1>
        <p className="status">Conectando ao banco local…</p>
      </main>
    )
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>LearnDeck</h1>
        <span className="app-header__version">v{info.version}</span>
      </header>
      <StudyPanel workspaceId={info.workspace.id} />
    </div>
  )
}
