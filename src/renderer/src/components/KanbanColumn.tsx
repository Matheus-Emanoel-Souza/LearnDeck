import type { ReactNode } from 'react'
import type { BoardColumn, Card } from '@shared/types'
import KanbanCard from './KanbanCard'
import type { CardActionId } from './CardActionsMenu'

interface KanbanColumnProps {
  column: BoardColumn
  cards: Card[]
  columnsById: Map<string, BoardColumn>
  isDropTarget: boolean
  onCardDragStart: (cardId: string) => void
  onColumnDragStart: (columnId: string) => void
  onDragOverColumn: () => void
  onDropOnColumn: () => void
  onDragOverCard: (index: number) => void
  onDropOnCard: (index: number) => void
  onOpenCard: (card: Card) => void
  onCardAction: (card: Card, action: CardActionId) => void
  onContextMenu: (e: React.MouseEvent, columnId: string) => void
  headerExtra?: ReactNode
}

/**
 * Coluna do quadro Kanban: cards arrastáveis + a própria coluna arrastável
 * (pega e solta pelo cabeçalho pra reordenar entre as outras — ver
 * KanbanBoard). Renomear/duplicar/cor/excluir ficam no menu de contexto
 * (botão direito no cabeçalho) — o cabeçalho é draggable, então clique nele
 * não funciona pra editar o nome.
 */
export default function KanbanColumn({
  column,
  cards,
  columnsById,
  isDropTarget,
  onCardDragStart,
  onColumnDragStart,
  onDragOverColumn,
  onDropOnColumn,
  onDragOverCard,
  onDropOnCard,
  onOpenCard,
  onCardAction,
  onContextMenu,
  headerExtra
}: KanbanColumnProps): JSX.Element {
  return (
    <div
      className={`kanban-column ${isDropTarget ? 'kanban-column--drop-target' : ''}`}
      style={column.color ? ({ '--column-color': column.color } as React.CSSProperties) : undefined}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOverColumn()
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDropOnColumn()
      }}
    >
      <div
        className="kanban-column__header"
        draggable
        onDragStart={() => onColumnDragStart(column.id)}
        onContextMenu={(e) => onContextMenu(e, column.id)}
        title="Arraste para reordenar · botão direito para renomear e mais opções"
      >
        <h3>{column.name}</h3>
        <span className="kanban-column__count">{cards.length}</span>
      </div>

      <div className="kanban-column__cards">
        {cards.map((card, index) => (
          <KanbanCard
            key={card.id}
            card={card}
            column={columnsById.get(card.columnId)}
            index={index}
            onDragStart={onCardDragStart}
            onDragOverCard={onDragOverCard}
            onDropOnCard={onDropOnCard}
            onOpen={onOpenCard}
            onAction={onCardAction}
          />
        ))}
        {cards.length === 0 && <p className="empty-hint">Nenhum card aqui.</p>}
      </div>

      {headerExtra && <div className="kanban-column__footer">{headerExtra}</div>}
    </div>
  )
}
