import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Card, CardStatus, Group } from '@shared/types'
import { buildGroupTree } from '../lib/groupTree'
import GroupSidebar from '../components/GroupSidebar'
import NewCardForm from '../components/NewCardForm'
import CardListItem from '../components/CardListItem'

interface StudyPanelProps {
  workspaceId: string
}

/**
 * Painel inicial: grupos (matérias/projetos) na lateral, cards do grupo
 * selecionado no centro, com formulário para criar novos cards.
 * Kanban visual (colunas + arrastar) entra na Fase 2 (ver docs/roadmap.md).
 */
export default function StudyPanel({ workspaceId }: StudyPanelProps): JSX.Element {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tree = useMemo(() => buildGroupTree(groups), [groups])

  const reloadGroups = useCallback(async () => {
    const list = await window.api.groups.list(workspaceId)
    setGroups(list)
    return list
  }, [workspaceId])

  useEffect(() => {
    reloadGroups().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [reloadGroups])

  const reloadCards = useCallback(async (groupId: string) => {
    setLoadingCards(true)
    try {
      const list = await window.api.cards.listByGroup(groupId)
      setCards(list)
    } finally {
      setLoadingCards(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedGroupId) {
      setCards([])
      return
    }
    reloadCards(selectedGroupId).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : String(err))
    )
  }, [selectedGroupId, reloadCards])

  async function handleCreateGroup(name: string, parentGroupId: string | null): Promise<void> {
    try {
      const created = await window.api.groups.create({ workspaceId, name, parentGroupId })
      await reloadGroups()
      setSelectedGroupId(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleCreateCard(title: string, description: string | null): Promise<void> {
    if (!selectedGroupId) return
    try {
      await window.api.cards.create({ groupId: selectedGroupId, title, description })
      await reloadCards(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleChangeStatus(cardId: string, status: CardStatus): Promise<void> {
    if (!selectedGroupId) return
    try {
      await window.api.cards.update(cardId, { status })
      await reloadCards(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  return (
    <div className="study-panel">
      <GroupSidebar
        tree={tree}
        selectedGroupId={selectedGroupId}
        onSelect={setSelectedGroupId}
        onCreateGroup={handleCreateGroup}
      />

      <section className="card-panel">
        {error && <p className="status status--error">{error}</p>}

        {!selectedGroup && (
          <p className="empty-hint">Selecione um grupo à esquerda (ou crie um) para ver e criar cards.</p>
        )}

        {selectedGroup && (
          <>
            <header className="card-panel__header">
              <h2>{selectedGroup.name}</h2>
              <NewCardForm onCreate={handleCreateCard} />
            </header>

            {loadingCards && <p className="empty-hint">Carregando cards…</p>}

            {!loadingCards && cards.length === 0 && (
              <p className="empty-hint">Nenhum card ainda neste grupo. Crie o primeiro acima.</p>
            )}

            <div className="card-list">
              {cards.map((card) => (
                <CardListItem key={card.id} card={card} onChangeStatus={handleChangeStatus} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
