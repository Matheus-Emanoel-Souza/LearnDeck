import type Database from 'better-sqlite3'
import type { CreateGroupInput, Group } from '@shared/types'
import {
  countCardsInGroup,
  countSubgroups,
  createGroup as insertGroupRow,
  getGroup,
  softDeleteGroup
} from '../repositories/groupRepository'
import { insertBoardColumn, updateBoardColumnRow } from '../repositories/boardColumnRepository'

/** Mesmo conjunto de colunas que toda matéria nova começa com (era o seed
 * fixo por workspace da migration 002; agora cada matéria traz o seu). */
const DEFAULT_COLUMNS: Array<{ name: string; isDone: boolean }> = [
  { name: 'Backlog', isDone: false },
  { name: 'A estudar', isDone: false },
  { name: 'Estudando', isDone: false },
  { name: 'Pausado', isDone: false },
  { name: 'Revisar', isDone: false },
  { name: 'Concluído', isDone: true }
]

/** Cria a matéria/grupo e já semeia suas colunas padrão do quadro — sem isso
 * a matéria nasceria sem lugar nenhum pra um card novo entrar. */
export function createGroup(db: Database.Database, input: CreateGroupInput): Group {
  const run = db.transaction(() => {
    const group = insertGroupRow(db, input)
    for (const column of DEFAULT_COLUMNS) {
      const created = insertBoardColumn(db, { groupId: group.id, name: column.name })
      if (column.isDone) updateBoardColumnRow(db, created.id, { isDone: true })
    }
    return group
  })

  return run()
}

/**
 * Exclui a matéria/grupo — recusa se ainda tem subgrupos ou cards (o usuário
 * precisa mover ou excluir o conteúdo antes), mesma regra do "excluir coluna".
 */
export function deleteGroup(db: Database.Database, id: string): void {
  const group = getGroup(db, id)
  if (!group) throw new Error(`Grupo não encontrado: ${id}`)

  const subgroupCount = countSubgroups(db, id)
  if (subgroupCount > 0) {
    throw new Error(
      `Essa matéria ainda tem ${subgroupCount} subgrupo${subgroupCount === 1 ? '' : 's'}. Mova ou exclua os subgrupos antes de excluir a matéria.`
    )
  }

  const cardCount = countCardsInGroup(db, id)
  if (cardCount > 0) {
    throw new Error(
      `Essa matéria ainda tem ${cardCount} card${cardCount === 1 ? '' : 's'}. Mova ou exclua os cards antes de excluir a matéria.`
    )
  }

  softDeleteGroup(db, id)
}
