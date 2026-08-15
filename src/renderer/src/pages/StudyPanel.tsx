import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Card, CardStatus, Group } from '@shared/types'
import { buildGroupTree } from '../lib/groupTree'
import { reorderCards } from '../lib/kanban'
import GroupSidebar from '../components/GroupSidebar'
import KanbanBoard from '../components/KanbanBoard'
import CardDetailPage from './CardDetailPage'

interface StudyPanelProps {
  workspaceId: string
}

/**
 * Painel inicial: grupos (matérias/projetos) na lateral, quadro Kanban do
 * grupo selecionado no centro. Ver docs/roadmap.md (Fase 2).
 */
export default function StudyPanel({ workspaceId }: StudyPanelProps): JSX.Element {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<Card | null>(null)

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

  async function handleMoveCard(
    cardId: string,
    targetStatus: CardStatus,
    targetIndex: number | null
  ): Promise<void> {
    if (!selectedGroupId) return
    const updates = reorderCards(cards, cardId, targetStatus, targetIndex)
    if (updates.length === 0) return

    // Atualização otimista: o Kanban já reflete a nova posição/coluna
    // enquanto as chamadas IPC (e o registro em status_history) acontecem.
    setCards((prev) =>
      prev.map((card) => {
        const update = updates.find((u) => u.id === card.id)
        return update ? { ...card, status: update.status, position: update.position } : card
      })
    )

    try {
      for (const update of updates) {
        await window.api.cards.update(update.id, { status: update.status, position: update.position })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      await reloadCards(selectedGroupId)
    }
  }

  async function handleNavigateToCard(cardId: string): Promise<void> {
    try {
      const target = await window.api.cards.get(cardId)
      if (target) setViewingCard(target)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleBackFromCard(): void {
    setViewingCard(null)
    // O card pode ter mudado de status/posição, ou a relação pode ter sido
    // editada; recarrega do banco em vez de tentar reconciliar em memória.
    if (selectedGroupId) reloadCards(selectedGroupId).catch(() => undefined)
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  if (viewingCard) {
    return (
      <CardDetailPage
        card={viewingCard}
        workspaceId={workspaceId}
        onBack={handleBackFromCard}
        onNavigateToCard={(cardId) => void handleNavigateToCard(cardId)}
      />
    )
  }

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
          <p className="empty-hint">Selecione um grupo à esquerda (ou crie um) para ver o quadro.</p>
        )}

        {selectedGroup && (
          <>
            <header className="card-panel__header">
              <h2>{selectedGroup.name}</h2>
            </header>

            {loadingCards && <p className="empty-hint">Carregando cards…</p>}

            {!loadingCards && (
              <KanbanBoard
                cards={cards}
                onMoveCard={handleMoveCard}
                onCreateCard={handleCreateCard}
                onOpenCard={setViewingCard}
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}
