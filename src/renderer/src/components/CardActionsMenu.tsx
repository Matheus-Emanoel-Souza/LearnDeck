import { useEffect, useRef, useState } from 'react'

export type CardActionId = 'apontamento' | 'comunicacao' | 'agrupar' | 'filho'

interface CardActionsMenuProps {
  onAction: (action: CardActionId) => void
}

const ACTIONS: Array<{ id: CardActionId; label: string; icon: JSX.Element }> = [
  {
    id: 'apontamento',
    label: 'Novo apontamento',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'comunicacao',
    label: 'Enviar comunicação',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M4 5h16v11H8l-4 4V5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    id: 'agrupar',
    label: 'Agrupar ticket',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M9 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm6 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M11 9.5h3" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'filho',
    label: 'Abrir ticket filho',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 4v9a3 3 0 0 0 3 3h7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 12l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
]

/**
 * Botão de três pontos no canto do card + menu com as ações que hoje ficam
 * espalhadas dentro da tela de detalhe (cronômetro, comentários, cards
 * relacionados). Cada item aqui só dispara a ação já existente — ver
 * StudyPanel.handleCardAction. Fecha ao escolher uma opção, clicar fora ou
 * Esc, igual ao ColumnContextMenu.
 */
export default function CardActionsMenu({ onAction }: CardActionsMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div
      className="card-actions-menu"
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="card-actions-menu__trigger"
        title="Mais ações"
        aria-label="Mais ações do card"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <div className="card-actions-menu__panel" role="menu">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className="card-actions-menu__item"
              role="menuitem"
              onClick={() => {
                onAction(action.id)
                setOpen(false)
              }}
            >
              <span className="card-actions-menu__icon">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
