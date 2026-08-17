import { useEffect, useRef, useState } from 'react'
import type { AppNotification } from '@shared/types'
import { formatDateTime } from '../lib/formatDate'

interface NotificationBellProps {
  workspaceId: string
  onOpenCard: (cardId: string) => void
  onViewAll: () => void
}

const POLL_INTERVAL_MS = 60_000

/**
 * Sino no cabeçalho: contador de não lidas + dropdown com as mais recentes.
 * Atualiza por push do main (notifications:changed, quando o scan periódico
 * acha algo novo) e por polling de segurança (caso a janela perca o push).
 */
export default function NotificationBell({ workspaceId, onOpenCard, onViewAll }: NotificationBellProps): JSX.Element {
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<AppNotification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  function refreshCount(): void {
    window.api.notifications
      .countUnread(workspaceId)
      .then(setUnreadCount)
      .catch(() => undefined)
  }

  useEffect(() => {
    window.api.notifications.scanNow(workspaceId).finally(refreshCount)
    const poll = setInterval(refreshCount, POLL_INTERVAL_MS)
    const unsubscribe = window.api.notifications.onChanged(refreshCount)
    return () => {
      clearInterval(poll)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  useEffect(() => {
    function handlePointerDown(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function toggleOpen(): void {
    const next = !open
    setOpen(next)
    if (next) {
      window.api.notifications
        .list(workspaceId)
        .then((all) => setRecent(all.slice(0, 8)))
        .catch(() => undefined)
    }
  }

  async function handleClickItem(n: AppNotification): Promise<void> {
    if (!n.isRead) {
      await window.api.notifications.markRead(n.id)
      refreshCount()
    }
    setOpen(false)
    onOpenCard(n.cardId)
  }

  return (
    <div ref={ref} className="notification-bell">
      <button className="notification-bell__button" onClick={toggleOpen} title="Notificações">
        🔔
        {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-bell__panel">
          <div className="notification-bell__header">
            <span>Notificações</span>
            {unreadCount > 0 && (
              <button
                className="link-button"
                onClick={async () => {
                  await window.api.notifications.markAllRead(workspaceId)
                  refreshCount()
                  setRecent((prev) => prev.map((n) => ({ ...n, isRead: true })))
                }}
              >
                marcar todas como lidas
              </button>
            )}
          </div>

          <div className="notification-bell__list">
            {recent.map((n) => (
              <button
                key={n.id}
                className={`notification-bell__item ${n.isRead ? '' : 'notification-bell__item--unread'}`}
                onClick={() => void handleClickItem(n)}
              >
                <span className="notification-bell__item-message">{n.message}</span>
                <span className="notification-bell__item-date">{formatDateTime(n.createdAt)}</span>
              </button>
            ))}
            {recent.length === 0 && <p className="empty-hint">Nenhuma notificação ainda.</p>}
          </div>

          <button
            className="notification-bell__view-all"
            onClick={() => {
              setOpen(false)
              onViewAll()
            }}
          >
            Ver todas
          </button>
        </div>
      )}
    </div>
  )
}
