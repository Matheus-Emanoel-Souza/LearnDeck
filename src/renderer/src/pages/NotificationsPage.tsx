import { useEffect, useState } from 'react'
import type { AppNotification } from '@shared/types'
import { formatDateTime } from '../lib/formatDate'

interface NotificationsPageProps {
  workspaceId: string
  onOpenCard: (cardId: string) => void
}

/**
 * Central de notificações: histórico completo (fica salvo mesmo depois de
 * lida — nunca é apagado daqui, só marcado como lida). Mensagem, prazo que
 * gerou o alerta, quando foi gerada, lida/não lida e abrir o ticket.
 */
export default function NotificationsPage({ workspaceId, onOpenCard }: NotificationsPageProps): JSX.Element {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [error, setError] = useState<string | null>(null)

  function reload(): void {
    window.api.notifications
      .list(workspaceId)
      .then(setNotifications)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }

  useEffect(() => {
    window.api.notifications.scanNow(workspaceId).finally(reload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  async function handleMarkRead(id: string): Promise<void> {
    await window.api.notifications.markRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  async function handleMarkAllRead(): Promise<void> {
    await window.api.notifications.markAllRead(workspaceId)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  async function handleOpen(n: AppNotification): Promise<void> {
    if (!n.isRead) await handleMarkRead(n.id)
    onOpenCard(n.cardId)
  }

  return (
    <div className="dashboard">
      <section className="card-section">
        <div className="notifications-page__header">
          <h3>Notificações {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount}</span>}</h3>
          {unreadCount > 0 && (
            <button className="secondary-button" onClick={() => void handleMarkAllRead()}>
              Marcar todas como lidas
            </button>
          )}
        </div>

        {error && <p className="status status--error">{error}</p>}

        <ul className="notifications-list">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`notifications-list__item ${n.isRead ? '' : 'notifications-list__item--unread'}`}
            >
              <div className="notifications-list__main">
                <button className="notifications-list__message" onClick={() => void handleOpen(n)}>
                  {n.message}
                </button>
                <span className="notifications-list__meta">
                  {n.kind === 'subtask' ? 'Subtarefa' : 'Ticket'} · gerada em {formatDateTime(n.createdAt)}
                </span>
              </div>
              <div className="notifications-list__actions">
                {!n.isRead && (
                  <button className="link-button" onClick={() => void handleMarkRead(n.id)}>
                    marcar como lida
                  </button>
                )}
                <button className="secondary-button" onClick={() => void handleOpen(n)}>
                  Abrir
                </button>
              </div>
            </li>
          ))}
          {notifications.length === 0 && <p className="empty-hint">Nenhuma notificação ainda.</p>}
        </ul>
      </section>
    </div>
  )
}
