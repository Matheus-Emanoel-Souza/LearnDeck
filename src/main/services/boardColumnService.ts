import type Database from 'better-sqlite3'
import type { BoardColumn, CreateBoardColumnInput, UpdateBoardColumnInput } from '@shared/types'
import {
  countBoardColumns,
  countCardsInColumn,
  deleteBoardColumnRow,
  getBoardColumn,
  insertBoardColumn,
  listBoardColumns,
  reorderBoardColumnPositions,
  updateBoardColumnRow
} from '../repositories/boardColumnRepository'
import { duplicateCardRow, insertStatusHistory, listCardsByColumnId } from '../repositories/cardRepository'

export function listColumns(db: Database.Database, groupId: string): BoardColumn[] {
  return listBoardColumns(db, groupId)
}

export function createColumn(db: Database.Database, input: CreateBoardColumnInput): BoardColumn {
  if (!input.name.trim()) throw new Error('Nome da coluna é obrigatório')
  return insertBoardColumn(db, input)
}

export function updateColumn(db: Database.Database, id: string, patch: UpdateBoardColumnInput): BoardColumn {
  if (patch.name !== undefined && !patch.name.trim()) throw new Error('Nome da coluna é obrigatório')
  return updateBoardColumnRow(db, id, patch)
}

/**
 * Troca a posição da coluna com a vizinha nessa direção (reordenar por
 * "mover pra esquerda/direita" em vez de drag-and-drop — mais simples e
 * suficiente pro número pequeno de colunas de um quadro).
 */
export function moveColumn(db: Database.Database, id: string, direction: 'left' | 'right'): BoardColumn[] {
  const target = db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id) as
    | { group_id: string; position: number }
    | undefined
  if (!target) throw new Error(`Coluna não encontrada: ${id}`)

  const neighbor = db
    .prepare(
      `SELECT id, position FROM board_columns WHERE group_id = ? AND position ${
        direction === 'left' ? '<' : '>'
      } ? ORDER BY position ${direction === 'left' ? 'DESC' : 'ASC'} LIMIT 1`
    )
    .get(target.group_id, target.position) as { id: string; position: number } | undefined

  if (neighbor) {
    const run = db.transaction(() => {
      updateBoardColumnRow(db, id, { position: neighbor.position })
      updateBoardColumnRow(db, neighbor.id, { position: target.position })
    })
    run()
  }

  return listBoardColumns(db, target.group_id)
}

/**
 * Reordena as colunas de uma matéria via drag-and-drop no quadro:
 * `orderedIds` é a ordem final desejada, validada contra as colunas reais da
 * matéria antes de gravar (nunca confia cegamente no que veio do renderer).
 */
export function reorderColumns(
  db: Database.Database,
  groupId: string,
  orderedIds: string[]
): BoardColumn[] {
  const current = listBoardColumns(db, groupId)
  const currentIds = new Set(current.map((c) => c.id))
  const validOrder = orderedIds.filter((id) => currentIds.has(id))
  const missing = current.filter((c) => !validOrder.includes(c.id)).map((c) => c.id)

  reorderBoardColumnPositions(db, [...validOrder, ...missing])
  return listBoardColumns(db, groupId)
}

/**
 * Duplica a coluna (novo id, mesmo nome/cor) logo depois da original, e
 * duplica também todos os cards que estão nela (novos ids, mesmos
 * título/descrição, estatísticas de estudo zeradas) — pedido explícito do
 * usuário: "gerando outros códigos mas com os mesmos nomes".
 */
export function duplicateColumn(db: Database.Database, id: string): BoardColumn {
  const original = getBoardColumn(db, id)
  if (!original) throw new Error(`Coluna não encontrada: ${id}`)

  const run = db.transaction(() => {
    const copy = insertBoardColumn(db, { groupId: original.groupId, name: original.name })
    updateBoardColumnRow(db, copy.id, { color: original.color, isDone: original.isDone })

    const siblings = listBoardColumns(db, original.groupId)
    const order = siblings.filter((c) => c.id !== copy.id).map((c) => c.id)
    const originalIndex = order.indexOf(original.id)
    order.splice(originalIndex + 1, 0, copy.id)
    reorderBoardColumnPositions(db, order)

    const sourceCards = listCardsByColumnId(db, original.id)
    for (const card of sourceCards) {
      const duplicated = duplicateCardRow(db, card, copy.id)
      insertStatusHistory(db, duplicated.id, null, duplicated.columnId)
    }

    const refreshed = getBoardColumn(db, copy.id)
    if (!refreshed) throw new Error('Falha ao duplicar coluna')
    return refreshed
  })

  return run()
}

/**
 * Exclui a coluna — recusa se ela ainda tem cards (o usuário precisa mover
 * os cards antes) ou se for a última coluna da matéria (sempre precisa
 * sobrar um lugar pra cards novos entrarem). Como cada coluna pertence a uma
 * única matéria, isso já olha só os cards/colunas daquela matéria — excluir
 * não afeta o quadro de nenhuma outra.
 */
export function deleteColumn(db: Database.Database, id: string): void {
  const column = db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id) as
    | { group_id: string }
    | undefined
  if (!column) throw new Error(`Coluna não encontrada: ${id}`)

  const cardCount = countCardsInColumn(db, id)
  if (cardCount > 0) {
    throw new Error(
      `Essa coluna ainda tem ${cardCount} card${cardCount === 1 ? '' : 's'}. Mova ou exclua os cards antes de excluir a coluna.`
    )
  }

  if (countBoardColumns(db, column.group_id) <= 1) {
    throw new Error('O quadro precisa ter pelo menos uma coluna.')
  }

  deleteBoardColumnRow(db, id)
}
