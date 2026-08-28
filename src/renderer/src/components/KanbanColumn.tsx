import type { BoardColumn, Card } from '@shared/types'
import KanbanCard from './KanbanCard'
import type { CardActionId } from './CardActionsMenu'
import { useLongPress } from '../lib/useLongPress'

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
  onContextMenu: (x: number, y: number, columnId: string) => void
}

/**
 * Coluna do quadro Kanban: cards arrastáveis + a própria coluna arrastável
 * (pega e solta pelo cabeçalho pra reordenar entre as outras — ver
 * KanbanBoard). Renomear/duplicar/cor/excluir ficam no menu de contexto
 * (botão direito no cabeçalho no mouse; tocar e segurar em qualquer ponto da
 * coluna no toque, ver useLongPress) — o cabeçalho é draggable, então clique
 * nele não funciona pra editar o nome.
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
  onContextMenu
}: KanbanColumnProps): JSX.Element {
  // Toque e segure = mesmo menu do botão direito do mouse; o `contextmenu`
  // nativo não é confiável em toque (varia por navegador/PWA) e o cabeçalho
  // já é `draggable`, o que atrapalha ainda mais. Escuta na coluna inteira,
  // não só no cabeçalho — na tela pequena o cabeçalho é uma faixa fina,
  // difícil de acertar sem deslizar o dedo. Ignora toques que começam em
  // cima de um card: card já tem a própria interação (abrir/menu "⋯").
  const longPress = useLongPress((x, y) => onContextMenu(x, y, column.id), {
    ignoreSelector: '.kanban-card'
  })

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
      onTouchStart={longPress.onTouchStart}
      onTouchMove={longPress.onTouchMove}
      onTouchEnd={longPress.onTouchEnd}
      onTouchCancel={longPress.onTouchCancel}
    >
      <div
        className="kanban-column__header"
        draggable
        onDragStart={() => onColumnDragStart(column.id)}
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu(e.clientX, e.clientY, column.id)
        }}
        title="Arraste para reordenar · botão direito (ou toque e segure em qualquer ponto da coluna) para renomear e mais opções"
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
    </div>
  )
}
