import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadSidebarCollapsed, saveSidebarCollapsed } from '../lib/sidebarPrefs'
import type { BoardColumn, Card, Group } from '@shared/types'
import { buildGroupTree } from '../lib/groupTree'
import { reorderCards } from '../lib/kanban'
import GroupSidebar from '../components/GroupSidebar'
import KanbanBoard from '../components/KanbanBoard'
import type { CardActionId } from '../components/CardActionsMenu'
import CardDetailPage, { type CardDetailFocus } from './CardDetailPage'
import { useIsNarrow } from '../lib/useIsNarrow'

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
  const [viewingColumns, setViewingColumns] = useState<BoardColumn[]>([])
  const [viewingCardFocus, setViewingCardFocus] = useState<CardDetailFocus | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(loadSidebarCollapsed)
  const isNarrow = useIsNarrow()

  const tree = useMemo(() => buildGroupTree(groups), [groups])

  useEffect(() => {
    saveSidebarCollapsed(sidebarCollapsed)
  }, [sidebarCollapsed])

  function toggleSidebar(): void {
    setSidebarCollapsed((v) => !v)
  }

  const reloadGroups = useCallback(async () => {
    const list = await window.api.groups.list(workspaceId)
    setGroups(list)
    return list
  }, [workspaceId])

  useEffect(() => {
    reloadGroups().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [reloadGroups])

  // Cada matéria tem seu próprio conjunto de colunas agora, então recarrega
  // sempre que a matéria selecionada na lateral muda.
  const reloadColumns = useCallback(async (groupId: string) => {
    const list = await window.api.boardColumns.list(groupId)
    setColumns(list)
    return list
  }, [])

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
      setColumns([])
      return
    }
    reloadCards(selectedGroupId).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : String(err))
    )
    reloadColumns(selectedGroupId).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : String(err))
    )
  }, [selectedGroupId, reloadCards, reloadColumns])

  /** Abre um card em tela cheia com as colunas da matéria DELE — que pode não
   * ser a matéria selecionada na lateral (ex.: card relacionado de outra
   * matéria, aberto pelo Calendário/Notificações ou por "Relações"). */
  async function openCard(card: Card, focus: CardDetailFocus | null): Promise<void> {
    try {
      const cols = await window.api.boardColumns.list(card.groupId)
      setViewingColumns(cols)
      setViewingCardFocus(focus)
      setViewingCard(card)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleCreateGroup(name: string, parentGroupId: string | null): Promise<void> {
    try {
      const created = await window.api.groups.create({ workspaceId, name, parentGroupId })
      await reloadGroups()
      setSelectedGroupId(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDeleteGroup(groupId: string): Promise<void> {
    try {
      await window.api.groups.delete(groupId)
      await reloadGroups()
      if (selectedGroupId === groupId) setSelectedGroupId(null)
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
    if (!selectedGroupId) return
    try {
      await window.api.boardColumns.create({ groupId: selectedGroupId, name })
      await reloadColumns(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleRenameColumn(id: string, name: string): Promise<void> {
    if (!selectedGroupId) return
    try {
      await window.api.boardColumns.update(id, { name })
      await reloadColumns(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleReorderColumns(orderedIds: string[]): Promise<void> {
    if (!selectedGroupId) return
    try {
      await window.api.boardColumns.reorder(selectedGroupId, orderedIds)
      await reloadColumns(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDuplicateColumn(id: string): Promise<void> {
    if (!selectedGroupId) return
    try {
      await window.api.boardColumns.duplicate(id)
      await reloadColumns(selectedGroupId)
      await reloadCards(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleSetColumnColor(id: string, color: string | null): Promise<void> {
    if (!selectedGroupId) return
    try {
      await window.api.boardColumns.update(id, { color })
      await reloadColumns(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDeleteColumn(id: string): Promise<void> {
    if (!selectedGroupId) return
    if (!window.confirm('Excluir esta coluna? Só é possível se ela estiver vazia.')) return
    try {
      await window.api.boardColumns.delete(id)
      await reloadColumns(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleNavigateToCard(cardId: string): Promise<void> {
    try {
      const target = await window.api.cards.get(cardId)
      if (target) await openCard(target, null)
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
      await openCard(card, 'relations')
      return
    }

    const focus: CardDetailFocus = action === 'apontamento' ? 'timer' : action === 'comunicacao' ? 'comment' : 'relations'
    await openCard(card, focus)
  }

  function handleBackFromCard(): void {
    setViewingCard(null)
    setViewingCardFocus(null)
    // O card pode ter mudado de coluna/posição, ou a relação pode ter sido
    // editada; recarrega do banco em vez de tentar reconciliar em memória.
    if (selectedGroupId) reloadCards(selectedGroupId).catch(() => undefined)
  }

  async function handleDeleteCard(cardId: string): Promise<void> {
    try {
      await window.api.cards.delete(cardId)
      handleBackFromCard()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  if (viewingCard) {
    return (
      <CardDetailPage
        card={viewingCard}
        workspaceId={workspaceId}
        columns={viewingColumns}
        onBack={handleBackFromCard}
        onNavigateToCard={(cardId) => void handleNavigateToCard(cardId)}
        onDelete={handleDeleteCard}
        initialFocus={viewingCardFocus}
      />
    )
  }

  const board = (
    <>
      {loadingCards && <p className="empty-hint">Carregando cards…</p>}

      {!loadingCards && (
        <KanbanBoard
          cards={cards}
          columns={columns}
          onMoveCard={handleMoveCard}
          onCreateCard={handleCreateCard}
          onOpenCard={(card) => void openCard(card, null)}
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
  )

  // Telas estreitas usam drill-down: tela 1 lista as matérias, tela 2 mostra o
  // quadro da matéria escolhida (com voltar). Sem sidebar nem drawer.
  if (isNarrow) {
    if (!selectedGroup) {
      return (
        <div className="study-panel study-panel--narrow">
          <GroupSidebar
            asScreen
            tree={tree}
            selectedGroupId={selectedGroupId}
            onSelect={setSelectedGroupId}
            onCreateGroup={handleCreateGroup}
            onDeleteGroup={handleDeleteGroup}
            collapsed={false}
            onToggleCollapse={toggleSidebar}
          />
        </div>
      )
    }

    return (
      <div className="study-panel study-panel--narrow">
        <section className="card-panel">
          {error && <p className="status status--error">{error}</p>}

          <header className="card-panel__header card-panel__header--narrow">
            <button
              type="button"
              className="card-panel__back"
              onClick={() => setSelectedGroupId(null)}
              aria-label="Voltar para a lista de matérias"
            >
              ←
            </button>
            <h2>{selectedGroup.name}</h2>
          </header>

          {board}
        </section>
      </div>
    )
  }

  return (
    <div className="study-panel">
      <GroupSidebar
        tree={tree}
        selectedGroupId={selectedGroupId}
        onSelect={setSelectedGroupId}
        onCreateGroup={handleCreateGroup}
        onDeleteGroup={handleDeleteGroup}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
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

            {board}
          </>
        )}
      </section>
    </div>
  )
}
