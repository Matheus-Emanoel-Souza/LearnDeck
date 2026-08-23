import { useEffect, useState } from 'react'

interface NotificationBellProps {
  workspaceId: string
  onOpenUpdates: () => void
}

const POLL_INTERVAL_MS = 60_000

/**
 * Sino no cabeçalho: agora é atalho pra página de Atualizações (changelog
 * interno), não abre mais o dropdown de notificações — essas continuam
 * acessíveis pela aba "Notificações". O contador segue mostrando não lidas
 * pra não perder o sinal visual de que algo pede atenção.
 */
export default function NotificationBell({ workspaceId, onOpenUpdates }: NotificationBellProps): JSX.Element {
  const [unreadCount, setUnreadCount] = useState(0)

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

  return (
    <button className="notification-bell__button" onClick={onOpenUpdates} title="Atualizações">
      🔔
      {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
  )
}
