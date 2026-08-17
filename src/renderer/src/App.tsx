import { useCallback, useEffect, useState } from 'react'
import type { AppInfo } from '../../main/ipc/app'
import type { BoardColumn, Card } from '@shared/types'
import StudyPanel from './pages/StudyPanel'
import Dashboard from './pages/Dashboard'
import CalendarPage from './pages/CalendarPage'
import NotificationsPage from './pages/NotificationsPage'
import Settings from './pages/Settings'
import CardDetailPage from './pages/CardDetailPage'
import NotificationBell from './components/NotificationBell'

type Tab = 'board' | 'dashboard' | 'calendar' | 'notifications' | 'settings'

export default function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('board')

  // Card aberto "globalmente" — Calendário e Notificações vivem fora do
  // StudyPanel, então pra abrir um ticket a partir delas o overlay do card
  // fica aqui em cima, por cima de qualquer aba (o board continua com sua
  // própria navegação interna pro clique direto no Kanban).
  const [globalCard, setGlobalCard] = useState<Card | null>(null)
  const [globalColumns, setGlobalColumns] = useState<BoardColumn[]>([])

  useEffect(() => {
    window.api.app
      .getInfo()
      .then(setInfo)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const openCardGlobally = useCallback((cardId: string) => {
    if (!info) return
    Promise.all([window.api.cards.get(cardId), window.api.boardColumns.list(info.workspace.id)])
      .then(([card, columns]) => {
        if (card) {
          setGlobalColumns(columns)
          setGlobalCard(card)
        }
      })
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info])

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

  if (globalCard) {
    return (
      <div className="app-root">
        <CardDetailPage
          card={globalCard}
          workspaceId={info.workspace.id}
          columns={globalColumns}
          onBack={() => setGlobalCard(null)}
          onNavigateToCard={openCardGlobally}
        />
      </div>
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
          <button
            className={`app-nav__tab ${tab === 'calendar' ? 'app-nav__tab--active' : ''}`}
            onClick={() => setTab('calendar')}
          >
            Calendário
          </button>
          <button
            className={`app-nav__tab ${tab === 'notifications' ? 'app-nav__tab--active' : ''}`}
            onClick={() => setTab('notifications')}
          >
            Notificações
          </button>
          <button
            className={`app-nav__tab ${tab === 'settings' ? 'app-nav__tab--active' : ''}`}
            onClick={() => setTab('settings')}
          >
            Configurações
          </button>
        </nav>
        <NotificationBell
          workspaceId={info.workspace.id}
          onOpenCard={openCardGlobally}
          onViewAll={() => setTab('notifications')}
        />
      </header>
      {tab === 'board' && <StudyPanel workspaceId={info.workspace.id} />}
      {tab === 'dashboard' && (
        <div className="card-panel">
          <Dashboard workspaceId={info.workspace.id} />
        </div>
      )}
      {tab === 'calendar' && (
        <div className="card-panel">
          <CalendarPage workspaceId={info.workspace.id} onOpenCard={openCardGlobally} />
        </div>
      )}
      {tab === 'notifications' && (
        <div className="card-panel">
          <NotificationsPage workspaceId={info.workspace.id} onOpenCard={openCardGlobally} />
        </div>
      )}
      {tab === 'settings' && (
        <div className="card-panel">
          <Settings currentVersion={info.version} workspaceId={info.workspace.id} />
        </div>
      )}
    </div>
  )
}
