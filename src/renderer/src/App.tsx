import { useCallback, useEffect, useState } from 'react'
import type { AppInfo } from '../../main/ipc/app'
import type { BoardColumn, Card } from '@shared/types'
import StudyPanel from './pages/StudyPanel'
import Dashboard from './pages/Dashboard'
import CalendarPage from './pages/CalendarPage'
import NotificationsPage from './pages/NotificationsPage'
import UpdatesPage from './pages/UpdatesPage'
import Settings from './pages/Settings'
import CardDetailPage, { type CardDetailFocus } from './pages/CardDetailPage'
import NotificationBell from './components/NotificationBell'
import ThemeToggle from './components/ThemeToggle'
import { useIsNarrow } from './lib/useIsNarrow'

type Tab = 'board' | 'dashboard' | 'calendar' | 'notifications' | 'updates' | 'settings'

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
  updates: 'Atualizações',
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
  const isSecondaryTab = tab === 'notifications' || tab === 'updates' || tab === 'settings'

  const openSecondary = useCallback(
    (target: Tab) => {
      if (!isSecondaryTab) setReturnTab(tab)
      setTab(target)
    },
    [tab, isSecondaryTab]
  )

  // Card aberto em tela cheia — único estado pra qualquer origem (Quadro,
  // Calendário, Notificações, card relacionado). Fica aqui no topo, por
  // cima de qualquer aba, pra "voltar" ser sempre consistente e sabermos de
  // onde veio (breadcrumb no botão de voltar, ver `origin`).
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [activeColumns, setActiveColumns] = useState<BoardColumn[]>([])
  const [activeFocus, setActiveFocus] = useState<CardDetailFocus | null>(null)
  const [origin, setOrigin] = useState<{ label: string } | null>(null)

  useEffect(() => {
    window.api.app
      .getInfo()
      .then(setInfo)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const openCard = useCallback(
    (card: Card, focus: CardDetailFocus | null, originLabel: string | null) => {
      window.api.boardColumns
        .list(card.groupId)
        .then((columns) => {
          setActiveColumns(columns)
          setActiveFocus(focus)
          setOrigin(originLabel ? { label: originLabel } : null)
          setActiveCard(card)
        })
        .catch(() => undefined)
    },
    []
  )

  const openCardById = useCallback(
    (cardId: string, focus: CardDetailFocus | null, originLabel: string | null) => {
      window.api.cards
        .get(cardId)
        .then((card) => {
          if (card) openCard(card, focus, originLabel)
        })
        .catch(() => undefined)
    },
    [openCard]
  )

  // Incrementa a cada fechamento — páginas que ficam montadas por baixo do
  // overlay (Quadro, Calendário, Notificações) usam isso pra recarregar seus
  // dados sem perder o próprio estado (matéria selecionada, mês do calendário).
  const [closeSignal, setCloseSignal] = useState(0)

  function closeCard(): void {
    setActiveCard(null)
    setActiveFocus(null)
    setOrigin(null)
    setCloseSignal((v) => v + 1)
  }

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
        <NotificationBell workspaceId={info.workspace.id} onOpenUpdates={() => openSecondary('updates')} />
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
      {tab === 'board' && (
        <StudyPanel
          workspaceId={info.workspace.id}
          onOpenCard={(card, focus) => openCard(card, focus, null)}
          onOpenCardById={(cardId, focus) => openCardById(cardId, focus, 'Quadro')}
          refreshSignal={closeSignal}
        />
      )}
      {tab === 'dashboard' && (
        <div className="card-panel">
          <Dashboard workspaceId={info.workspace.id} />
        </div>
      )}
      {tab === 'calendar' && (
        <div className="card-panel">
          <CalendarPage
            workspaceId={info.workspace.id}
            onOpenCard={(cardId) => openCardById(cardId, null, 'Calendário')}
            refreshSignal={closeSignal}
          />
        </div>
      )}
      {tab === 'notifications' && (
        <div className="card-panel">
          <NotificationsPage
            workspaceId={info.workspace.id}
            onOpenCard={(cardId) => openCardById(cardId, null, 'Notificações')}
            refreshSignal={closeSignal}
          />
        </div>
      )}
      {tab === 'updates' && (
        <div className="card-panel">
          <UpdatesPage />
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

      {activeCard && (
        <div className="app-root app-root--overlay">
          <CardDetailPage
            card={activeCard}
            workspaceId={info.workspace.id}
            columns={activeColumns}
            onBack={closeCard}
            backLabel={origin?.label ?? null}
            onNavigateToCard={(cardId) => openCardById(cardId, null, origin?.label ?? null)}
            onDelete={async (cardId) => {
              await window.api.cards.delete(cardId)
              closeCard()
            }}
            initialFocus={activeFocus}
          />
        </div>
      )}
    </div>
  )
}
