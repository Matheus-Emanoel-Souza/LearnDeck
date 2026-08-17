import { useMemo, useState } from 'react'
import type { BoardColumn, CardRelationType, CardRelationView, CardSummary } from '@shared/types'
import { CARD_RELATION_TYPES, CARD_RELATION_TYPE_LABELS } from '@shared/types'
import { columnIsDone, columnName } from '../lib/columns'
import StatusBadge from './StatusBadge'

interface CardRelationsProps {
  workspaceId: string
  cardId: string
  columns: BoardColumn[]
  relations: CardRelationView[]
  onAdd: (relatedCardId: string, relationType: CardRelationType) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onOpenCard: (cardId: string) => void
}

/**
 * Relacionamentos entre cards (pré-requisito, bloqueia, relacionado, parte
 * de). A busca é no workspace inteiro (não só no grupo atual), pois um card
 * de outra matéria pode muito bem ser pré-requisito deste. Ao clicar em
 * "Relacionar card", a lista completa de cards do workspace aparece para
 * seleção direta com o mouse (com um filtro opcional para encurtar a lista).
 */
export default function CardRelations({
  workspaceId,
  cardId,
  columns,
  relations,
  onAdd,
  onRemove,
  onOpenCard
}: CardRelationsProps): JSX.Element {
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [allCards, setAllCards] = useState<CardSummary[]>([])
  const [filter, setFilter] = useState('')
  const [relationType, setRelationType] = useState<CardRelationType>('related_to')
  const [busy, setBusy] = useState(false)

  const relatedIds = useMemo(() => new Set(relations.map((rel) => rel.card.id)), [relations])

  const visibleCards = useMemo(() => {
    const term = filter.trim().toLowerCase()
    return allCards.filter(
      (c) => !relatedIds.has(c.id) && (term === '' || c.title.toLowerCase().includes(term))
    )
  }, [allCards, relatedIds, filter])

  async function togglePanel(): Promise<void> {
    if (panelOpen) {
      setPanelOpen(false)
      return
    }
    setPanelOpen(true)
    setLoading(true)
    try {
      setAllCards(await window.api.cards.listAllSummaries(workspaceId, cardId))
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(target: CardSummary): Promise<void> {
    setBusy(true)
    try {
      await onAdd(target.id, relationType)
      setFilter('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <ul className="relation-list">
        {relations.map((rel) => (
          <li key={rel.id} className="relation-item">
            <div>
              <span className="relation-item__type">
                {rel.direction === 'outgoing'
                  ? CARD_RELATION_TYPE_LABELS[rel.relationType]
                  : `é ${CARD_RELATION_TYPE_LABELS[rel.relationType].replace(/^é /, '')} deste`}
              </span>
              <button className="relation-item__title" onClick={() => onOpenCard(rel.card.id)}>
                {rel.card.title}
              </button>
              <StatusBadge
                name={columnName(columns, rel.card.columnId)}
                isDone={columnIsDone(columns, rel.card.columnId)}
              />
            </div>
            <button className="link-button" onClick={() => onRemove(rel.id)} title="Remover relação">
              remover
            </button>
          </li>
        ))}
        {relations.length === 0 && <p className="empty-hint">Nenhum card relacionado ainda.</p>}
      </ul>

      <div className="relation-picker">
        <div className="relation-picker__controls">
          <select value={relationType} onChange={(e) => setRelationType(e.target.value as CardRelationType)}>
            {CARD_RELATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {CARD_RELATION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <button type="button" className="secondary-button" onClick={togglePanel}>
            {panelOpen ? 'Fechar lista' : '+ Relacionar card'}
          </button>
        </div>

        {panelOpen && (
          <div className="relation-picker__panel">
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar pelo título…"
              disabled={busy}
            />
            <ul className="relation-picker__list">
              {loading && <li className="empty-hint">Carregando…</li>}
              {!loading &&
                visibleCards.map((c) => (
                  <li key={c.id}>
                    <button type="button" disabled={busy} onClick={() => handleAdd(c)}>
                      <span>{c.title}</span>
                      <StatusBadge
                        name={columnName(columns, c.columnId)}
                        isDone={columnIsDone(columns, c.columnId)}
                      />
                    </button>
                  </li>
                ))}
              {!loading && visibleCards.length === 0 && (
                <li className="empty-hint">Nenhum card disponível para relacionar.</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
