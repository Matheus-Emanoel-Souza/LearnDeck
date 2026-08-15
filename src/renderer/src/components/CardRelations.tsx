import { useEffect, useState } from 'react'
import type { CardRelationType, CardRelationView, CardSummary } from '@shared/types'
import { CARD_RELATION_TYPES, CARD_RELATION_TYPE_LABELS } from '@shared/types'
import StatusBadge from './StatusBadge'

interface CardRelationsProps {
  workspaceId: string
  cardId: string
  relations: CardRelationView[]
  onAdd: (relatedCardId: string, relationType: CardRelationType) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onOpenCard: (cardId: string) => void
}

/**
 * Relacionamentos entre cards (pré-requisito, bloqueia, relacionado, parte
 * de). A busca é no workspace inteiro (não só no grupo atual), pois um card
 * de outra matéria pode muito bem ser pré-requisito deste.
 */
export default function CardRelations({
  workspaceId,
  cardId,
  relations,
  onAdd,
  onRemove,
  onOpenCard
}: CardRelationsProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CardSummary[]>([])
  const [relationType, setRelationType] = useState<CardRelationType>('related_to')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timeout = setTimeout(() => {
      window.api.cards
        .search(workspaceId, query, cardId)
        .then(setResults)
        .catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(timeout)
  }, [query, workspaceId, cardId])

  async function handleAdd(target: CardSummary): Promise<void> {
    setBusy(true)
    try {
      await onAdd(target.id, relationType)
      setQuery('')
      setResults([])
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
              <StatusBadge status={rel.card.status} />
            </div>
            <button className="link-button" onClick={() => onRemove(rel.id)} title="Remover relação">
              remover
            </button>
          </li>
        ))}
        {relations.length === 0 && <p className="empty-hint">Nenhum card relacionado ainda.</p>}
      </ul>

      <div className="relation-search">
        <select value={relationType} onChange={(e) => setRelationType(e.target.value as CardRelationType)}>
          {CARD_RELATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {CARD_RELATION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar card pelo título…"
          disabled={busy}
        />
        {results.length > 0 && (
          <ul className="relation-search__results">
            {results.map((result) => (
              <li key={result.id}>
                <button disabled={busy} onClick={() => handleAdd(result)}>
                  {result.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
