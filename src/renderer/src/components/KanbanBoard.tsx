import { useCallback, useEffect, useRef, useState } from 'react'
import type { BoardColumn, Card } from '@shared/types'
import { groupCardsByColumn } from '../lib/kanban'
import { useIsNarrow } from '../lib/useIsNarrow'
import KanbanColumn from './KanbanColumn'
import NewCardForm from './NewCardForm'
import ColumnContextMenu from './ColumnContextMenu'
import NewColumnMenu from './NewColumnMenu'
import type { CardActionId } from './CardActionsMenu'

interface KanbanBoardProps {
  cards: Card[]
  columns: BoardColumn[]
  onMoveCard: (cardId: string, targetColumnId: string, targetIndex: number | null) => Promise<void>
  onCreateCard: (
    title: string,
    description: string | null,
    dueDate: string | null,
    dueTime: string | null,
    columnId: string
  ) => Promise<void>
  onOpenCard: (card: Card) => void
  onCardAction: (card: Card, action: CardActionId) => void
  onCreateColumn: (name: string) => Promise<void>
  onRenameColumn: (id: string, name: string) => Promise<void>
  onReorderColumns: (orderedIds: string[]) => Promise<void>
  onDuplicateColumn: (id: string) => Promise<void>
  onSetColumnColor: (id: string, color: string | null) => Promise<void>
  onDeleteColumn: (id: string) => Promise<void>
}

/**
 * Quadro Kanban: colunas dinâmicas (nome/cor/ordem editáveis pelo usuário —
 * arraste o cabeçalho pra reordenar, botão direito pra duplicar/colorir/
 * excluir), cards arrastáveis entre e dentro delas (drag-and-drop nativo,
 * sem dependência extra). Criação de card é uma ação global no topo do
 * quadro ("+ Novo ticket"), com a coluna de destino selecionável.
 */
export default function KanbanBoard({
  cards,
  columns,
  onMoveCard,
  onCreateCard,
  onOpenCard,
  onCardAction,
  onCreateColumn,
  onRenameColumn,
  onReorderColumns,
  onDuplicateColumn,
  onSetColumnColor,
  onDeleteColumn
}: KanbanBoardProps): JSX.Element {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ columnId: string; x: number; y: number } | null>(null)
  const [newColumnMenu, setNewColumnMenu] = useState<{ x: number; y: number } | null>(null)

  const isNarrow = useIsNarrow()
  const boardRef = useRef<HTMLDivElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)
  // No estreito o quadro vira um carrossel: uma coluna ocupa a tela inteira e o
  // scroll-snap horizontal faz o "deslizar". Este índice espelha onde o dedo
  // parou, pra destacar o chip certo.
  const [activeColumn, setActiveColumn] = useState(0)

  const byColumn = groupCardsByColumn(cards, columns)
  const columnsById = new Map(columns.map((c) => [c.id, c]))

  const handleBoardScroll = useCallback(() => {
    const el = boardRef.current
    if (!el || !isNarrow || columns.length === 0) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveColumn(Math.max(0, Math.min(index, columns.length - 1)))
  }, [isNarrow, columns.length])

  /**
   * Tocar num chip troca de coluna instantaneamente, como uma aba. Sem
   * `behavior: 'smooth'` de propósito: a animação só roda quando o documento
   * está visível e, se ela não rodar, o quadro fica parado enquanto o chip já
   * mudou — estado inconsistente. O salto seco nunca dessincroniza.
   */
  function scrollToColumn(index: number): void {
    const el = boardRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth })
    setActiveColumn(index)
  }

  // Trocar de matéria (ou de conjunto de colunas) volta o carrossel pro começo.
  const columnIdsKey = columns.map((c) => c.id).join('|')
  useEffect(() => {
    setActiveColumn(0)
    boardRef.current?.scrollTo({ left: 0 })
  }, [columnIdsKey])

  // Mantém o chip ativo visível conforme o usuário desliza entre as colunas.
  useEffect(() => {
    if (!isNarrow) return
    const chip = chipsRef.current?.children[activeColumn]
    chip?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [activeColumn, isNarrow])

  function clearDrag(): void {
    setDraggedCardId(null)
    setDraggedColumnId(null)
    setDropTargetColumnId(null)
  }

  async function finishDrop(targetColumnId: string, targetIndex: number | null): Promise<void> {
    if (draggedColumnId) {
      const draggedId = draggedColumnId
      clearDrag()
      if (draggedId === targetColumnId) return
      const order = columns.map((c) => c.id).filter((id) => id !== draggedId)
      const targetIdx = order.indexOf(targetColumnId)
      order.splice(targetIdx, 0, draggedId)
      await onReorderColumns(order)
      return
    }

    const cardId = draggedCardId
    clearDrag()
    if (!cardId) return
    await onMoveCard(cardId, targetColumnId, targetIndex)
  }

  return (
    <div className="kanban-board-wrap">
      <div className="kanban-board__toolbar">
        <NewCardForm columns={columns} onCreate={onCreateCard} />
      </div>

      {isNarrow && columns.length > 0 && (
        <div className="kanban-chips" ref={chipsRef} role="tablist" aria-label="Colunas do quadro">
          {columns.map((column, index) => (
            <button
              key={column.id}
              type="button"
              role="tab"
              aria-selected={index === activeColumn}
              className={`kanban-chip ${index === activeColumn ? 'kanban-chip--active' : ''}`}
              onClick={() => scrollToColumn(index)}
            >
              {column.name}
              <span className="kanban-chip__count">{(byColumn.get(column.id) ?? []).length}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className={`kanban-board ${isNarrow ? 'kanban-board--carousel' : ''}`}
        ref={boardRef}
        onScroll={handleBoardScroll}
      >
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={byColumn.get(column.id) ?? []}
            columnsById={columnsById}
            isDropTarget={dropTargetColumnId === column.id}
            onCardDragStart={setDraggedCardId}
            onColumnDragStart={setDraggedColumnId}
            onDragOverColumn={() => setDropTargetColumnId(column.id)}
            onDropOnColumn={() => void finishDrop(column.id, null)}
            onDragOverCard={() => setDropTargetColumnId(column.id)}
            onDropOnCard={(index) => void finishDrop(column.id, index)}
            onOpenCard={onOpenCard}
            onCardAction={onCardAction}
            onContextMenu={(e, columnId) => {
              e.preventDefault()
              setContextMenu({ columnId, x: e.clientX, y: e.clientY })
            }}
          />
        ))}

        {/* Área de clique-direito pra criar coluna — só faz sentido no desktop,
            e no carrossel viraria uma "página" vazia a mais pra deslizar. */}
        {!isNarrow && (
          <div
            className="kanban-board__spacer"
            onContextMenu={(e) => {
              e.preventDefault()
              setNewColumnMenu({ x: e.clientX, y: e.clientY })
            }}
          />
        )}

        {contextMenu && (
          <ColumnContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            currentName={columnsById.get(contextMenu.columnId)?.name ?? ''}
            onRename={(name) => {
              void onRenameColumn(contextMenu.columnId, name)
              setContextMenu(null)
            }}
            onCreateColumn={(name) => {
              void onCreateColumn(name)
              setContextMenu(null)
            }}
            onDuplicate={() => {
              void onDuplicateColumn(contextMenu.columnId)
              setContextMenu(null)
            }}
            onSetColor={(color) => {
              void onSetColumnColor(contextMenu.columnId, color)
              setContextMenu(null)
            }}
            onDelete={() => {
              void onDeleteColumn(contextMenu.columnId)
              setContextMenu(null)
            }}
            onClose={() => setContextMenu(null)}
          />
        )}

        {newColumnMenu && (
          <NewColumnMenu
            x={newColumnMenu.x}
            y={newColumnMenu.y}
            onCreate={(name) => void onCreateColumn(name)}
            onClose={() => setNewColumnMenu(null)}
          />
        )}
      </div>
    </div>
  )
}
