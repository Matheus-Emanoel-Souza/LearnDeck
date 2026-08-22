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
import ThemeToggle from './components/ThemeToggle'
import { useIsNarrow } from './lib/useIsNarrow'

type Tab = 'board' | 'dashboard' | 'calendar' | 'notifications' | 'settings'

/** Abas da barra inferior no mobile. Notificações fica de fora (o sino no
 *  header já abre) e Configurações vira o botão ⚙ ao lado do tema — as duas
 *  são telas secundárias, alcançadas por cima da aba atual e com voltar. */
const BOTTOM_TABS = [
  { id: 'board', label: 'Quadro', icon: '📋' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'calendar', label: 'Calendário', icon: '📅' }
] as const satisfies ReadonlyArray<{ id: Tab; label: string; icon: string }>

const SECONDARY_TITLES: Record<string, string> = {
  notifications: 'Notificações',
  settings: 'Configurações'
}

export default function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('board')
  const isNarrow = useIsNarrow()

  // Aba pra onde o "voltar" das telas secundárias (notificações/configurações)
  // retorna — sempre a última aba principal visitada.
  const [returnTab, setReturnTab] = useState<Tab>('board')
  const isSecondaryTab = tab === 'notifications' || tab === 'settings'

  const openSecondary = useCallback(
    (target: Tab) => {
      if (!isSecondaryTab) setReturnTab(tab)
      setTab(target)
    },
    [tab, isSecondaryTab]
  )

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
    // Colunas são por matéria agora — só dá pra saber quais depois de ter o
    // card em mãos (ele pode ser de uma matéria diferente da que está aberta).
    window.api.cards
      .get(cardId)
      .then(async (card) => {
        if (!card) return
        const columns = await window.api.boardColumns.list(card.groupId)
        setGlobalColumns(columns)
        setGlobalCard(card)
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
          onDelete={async (cardId) => {
            await window.api.cards.delete(cardId)
            setGlobalCard(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className={`app-root ${isNarrow ? 'app-root--narrow' : ''}`}>
      <header className="app-header">
        {isNarrow && isSecondaryTab ? (
          <button
            type="button"
            className="app-header__back"
            onClick={() => setTab(returnTab)}
            aria-label="Voltar"
          >
            ←
          </button>
        ) : null}
        <h1>{isNarrow && isSecondaryTab ? SECONDARY_TITLES[tab] : 'LearnDeck'}</h1>
        <span className="app-header__version">v{info.version}</span>
        {!isNarrow && (
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
        )}
        <NotificationBell
          workspaceId={info.workspace.id}
          onOpenCard={openCardGlobally}
          onViewAll={() => openSecondary('notifications')}
        />
        {isNarrow && (
          <button
            type="button"
            className={`app-header__icon-btn ${tab === 'settings' ? 'app-header__icon-btn--active' : ''}`}
            onClick={() => openSecondary('settings')}
            title="Configurações"
            aria-label="Configurações"
          >
            ⚙
          </button>
        )}
        <ThemeToggle />
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
          <Settings currentVersion={info.version} />
        </div>
      )}

      {isNarrow && (
        <nav className="app-bottom-nav" aria-label="Navegação principal">
          {BOTTOM_TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              className={`app-bottom-nav__tab ${tab === id ? 'app-bottom-nav__tab--active' : ''}`}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <span className="app-bottom-nav__icon" aria-hidden="true">
                {icon}
              </span>
              <span className="app-bottom-nav__label">{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
