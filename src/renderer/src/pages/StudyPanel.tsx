import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BoardColumn, Card, Group } from '@shared/types'
import { buildGroupTree } from '../lib/groupTree'
import { reorderCards } from '../lib/kanban'
import GroupSidebar from '../components/GroupSidebar'
import KanbanBoard from '../components/KanbanBoard'
import type { CardActionId } from '../components/CardActionsMenu'
import CardDetailPage, { type CardDetailFocus } from './CardDetailPage'

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
  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<Card | null>(null)
  const [viewingCardFocus, setViewingCardFocus] = useState<CardDetailFocus | null>(null)

  const tree = useMemo(() => buildGroupTree(groups), [groups])

  const reloadGroups = useCallback(async () => {
    const list = await window.api.groups.list(workspaceId)
    setGroups(list)
    return list
  }, [workspaceId])

  const reloadColumns = useCallback(async () => {
    const list = await window.api.boardColumns.list(workspaceId)
    setColumns(list)
    return list
  }, [workspaceId])

  useEffect(() => {
    reloadGroups().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
    reloadColumns().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [reloadGroups, reloadColumns])

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

  async function handleCreateCard(
    title: string,
    description: string | null,
    dueDate: string | null,
    dueTime: string | null
  ): Promise<void> {
    if (!selectedGroupId) return
    try {
      await window.api.cards.create({ groupId: selectedGroupId, title, description, dueDate, dueTime })
      await reloadCards(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleMoveCard(
    cardId: string,
    targetColumnId: string,
    targetIndex: number | null
  ): Promise<void> {
    if (!selectedGroupId) return
    const updates = reorderCards(cards, columns, cardId, targetColumnId, targetIndex)
    if (updates.length === 0) return

    // Atualização otimista: o Kanban já reflete a nova posição/coluna
    // enquanto as chamadas IPC (e o registro em status_history) acontecem.
    setCards((prev) =>
      prev.map((card) => {
        const update = updates.find((u) => u.id === card.id)
        return update ? { ...card, columnId: update.columnId, position: update.position } : card
      })
    )

    try {
      for (const update of updates) {
        await window.api.cards.update(update.id, { columnId: update.columnId, position: update.position })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      await reloadCards(selectedGroupId)
    }
  }

  async function handleCreateColumn(name: string): Promise<void> {
    try {
      await window.api.boardColumns.create({ workspaceId, name })
      await reloadColumns()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleRenameColumn(id: string, name: string): Promise<void> {
    try {
      await window.api.boardColumns.update(id, { name })
      await reloadColumns()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleReorderColumns(orderedIds: string[]): Promise<void> {
    try {
      await window.api.boardColumns.reorder(workspaceId, orderedIds)
      await reloadColumns()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDuplicateColumn(id: string): Promise<void> {
    try {
      await window.api.boardColumns.duplicate(id)
      await reloadColumns()
      if (selectedGroupId) await reloadCards(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleSetColumnColor(id: string, color: string | null): Promise<void> {
    try {
      await window.api.boardColumns.update(id, { color })
      await reloadColumns()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDeleteColumn(id: string): Promise<void> {
    if (!window.confirm('Excluir esta coluna? Só é possível se ela estiver vazia.')) return
    try {
      await window.api.boardColumns.delete(id)
      await reloadColumns()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleNavigateToCard(cardId: string): Promise<void> {
    try {
      const target = await window.api.cards.get(cardId)
      if (target) {
        setViewingCardFocus(null)
        setViewingCard(target)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * Menu de ações (⋮) do card no Kanban. As 4 opções não são funcionalidades
   * novas — cada uma abre o card já na seção correspondente da tela de
   * detalhe (CardDetailPage), reaproveitando o que já existe lá.
   */
  async function handleCardAction(card: Card, action: CardActionId): Promise<void> {
    if (action === 'filho') {
      try {
        const relations = await window.api.relations.listByCard(card.id)
        if (relations.length === 1) {
          await handleNavigateToCard(relations[0].card.id)
          return
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return
      }
      // Nenhuma ou mais de uma relação: abre o card e deixa a pessoa escolher.
      setViewingCardFocus('relations')
      setViewingCard(card)
      return
    }

    const focus: CardDetailFocus = action === 'apontamento' ? 'timer' : action === 'comunicacao' ? 'comment' : 'relations'
    setViewingCardFocus(focus)
    setViewingCard(card)
  }

  function handleBackFromCard(): void {
    setViewingCard(null)
    setViewingCardFocus(null)
    // O card pode ter mudado de coluna/posição, ou a relação pode ter sido
    // editada; recarrega do banco em vez de tentar reconciliar em memória.
    if (selectedGroupId) reloadCards(selectedGroupId).catch(() => undefined)
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  if (viewingCard) {
    return (
      <CardDetailPage
        card={viewingCard}
        workspaceId={workspaceId}
        columns={columns}
        onBack={handleBackFromCard}
        onNavigateToCard={(cardId) => void handleNavigateToCard(cardId)}
        initialFocus={viewingCardFocus}
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
                columns={columns}
                onMoveCard={handleMoveCard}
                onCreateCard={handleCreateCard}
                onOpenCard={(card) => {
                  setViewingCardFocus(null)
                  setViewingCard(card)
                }}
                onCardAction={(card, action) => void handleCardAction(card, action)}
                onCreateColumn={handleCreateColumn}
                onRenameColumn={handleRenameColumn}
                onReorderColumns={handleReorderColumns}
                onDuplicateColumn={handleDuplicateColumn}
                onSetColumnColor={handleSetColumnColor}
                onDeleteColumn={handleDeleteColumn}
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}
