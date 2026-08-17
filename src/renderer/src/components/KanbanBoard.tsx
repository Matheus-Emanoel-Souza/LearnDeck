import { useState } from 'react'
import type { BoardColumn, Card } from '@shared/types'
import { groupCardsByColumn } from '../lib/kanban'
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
    dueTime: string | null
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
 * sem dependência extra). Novos cards sempre entram na primeira coluna
 * (regra do CardService).
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

  const byColumn = groupCardsByColumn(cards, columns)
  const columnsById = new Map(columns.map((c) => [c.id, c]))

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
    <div className="kanban-board">
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
          headerExtra={columns[0]?.id === column.id ? <NewCardForm onCreate={onCreateCard} /> : undefined}
        />
      ))}

      <div
        className="kanban-board__spacer"
        onContextMenu={(e) => {
          e.preventDefault()
          setNewColumnMenu({ x: e.clientX, y: e.clientY })
        }}
      />

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
  )
}
