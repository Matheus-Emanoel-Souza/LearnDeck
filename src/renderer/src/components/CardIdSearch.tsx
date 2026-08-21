import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Card } from '@shared/types'

interface CardIdSearchProps {
  workspaceId: string
  onFound: (card: Card) => void
}

/**
 * Campo de busca do Quadro para achar um ticket pelo ID — aceita tanto o ID
 * completo (copiado pelo CardIdBadge) quanto o prefixo curto de 8 caracteres
 * exibido nele. Busca no workspace inteiro, não só no grupo selecionado.
 */
export default function CardIdSearch({ workspaceId, onFound }: CardIdSearchProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || searching) return

    setSearching(true)
    setNotFound(false)
    try {
      const card = await window.api.cards.findByIdQuery(workspaceId, trimmed)
      if (card) {
        onFound(card)
        setQuery('')
      } else {
        setNotFound(true)
      }
    } finally {
      setSearching(false)
    }
  }

  return (
    <form className="card-id-search" onSubmit={(e) => void handleSubmit(e)}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setNotFound(false)
        }}
        placeholder="Buscar ticket pelo ID…"
        aria-label="Buscar ticket pelo ID"
        className={notFound ? 'card-id-search__input card-id-search__input--error' : 'card-id-search__input'}
      />
      <button type="submit" className="secondary-button" disabled={!query.trim() || searching}>
        {searching ? 'Buscando…' : 'Buscar'}
      </button>
      {notFound && <span className="card-id-search__hint">Nenhum ticket encontrado com esse ID.</span>}
    </form>
  )
}
