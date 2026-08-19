import { useState } from 'react'
import { useEffect } from 'react'
import { usePublisher, insertMarkdown$ } from '@mdxeditor/editor'
import type { CardSummary } from '@shared/types'

interface CardLinkDialogProps {
  workspaceId: string
  currentCardId: string
  onClose: () => void
}

/** Busca um card do workspace pra vincular no caderno como um link
 * `[Título](card://id)` — MDXEditor renderiza como link normal; o clique é
 * interceptado em CardNotebook pra navegar dentro do app em vez de tentar
 * abrir a URL. */
function CardLinkDialog({ workspaceId, currentCardId, onClose }: CardLinkDialogProps): JSX.Element {
  const insertMarkdown = usePublisher(insertMarkdown$)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CardSummary[]>([])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const search = query.trim()
        ? window.api.cards.search(workspaceId, query, currentCardId)
        : window.api.cards.listAllSummaries(workspaceId, currentCardId)
      search.then(setResults).catch(() => setResults([]))
    }, 200)
    return () => window.clearTimeout(handle)
  }, [query, workspaceId, currentCardId])

  function handlePick(card: CardSummary): void {
    insertMarkdown(`[${card.title}](card://${card.id}) `)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 'min(420px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <h2>Vincular ticket</h2>
        </div>
        <div className="modal-panel__body">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título…"
          />
          <ul className="notebook-cardlink-results">
            {results.map((card) => (
              <li key={card.id}>
                <button type="button" className="link-button" onClick={() => handlePick(card)}>
                  {card.title}
                </button>
              </li>
            ))}
            {results.length === 0 && <p className="empty-hint">Nenhum card encontrado.</p>}
          </ul>
          <div className="modal-section__row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Hook pra reaproveitar o diálogo de vínculo de ticket tanto na barra de
 * ferramentas quanto no comando `/ticket`. */
export function useCardLinkInserter(workspaceId: string, currentCardId: string): {
  open: () => void
  dialog: JSX.Element | null
} {
  const [isOpen, setIsOpen] = useState(false)
  return {
    open: () => setIsOpen(true),
    dialog: isOpen ? (
      <CardLinkDialog workspaceId={workspaceId} currentCardId={currentCardId} onClose={() => setIsOpen(false)} />
    ) : null
  }
}
