import { useEffect, useState } from 'react'
import type { AppInfo } from '../../main/ipc/app'
import StudyPanel from './pages/StudyPanel'
import Dashboard from './pages/Dashboard'

type Tab = 'board' | 'dashboard'

export default function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('board')

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
        <nav className="app-nav">
          <button
            className={`app-nav__tab ${tab === 'board' ? 'app-nav__tab--active' : ''}`}
            onClick={() => setTab('board')}
          >
            Quadro
          </button>
          <button
            className={`app-nav__tab ${tab === 'dashboard' ? 'app-nav__tab--active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
        </nav>
      </header>
      {tab === 'board' ? (
        <StudyPanel workspaceId={info.workspace.id} />
      ) : (
        <div className="card-panel">
          <Dashboard workspaceId={info.workspace.id} />
        </div>
      )}
    </div>
  )
}
