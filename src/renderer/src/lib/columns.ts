import type { BoardColumn } from '@shared/types'

/** Nome de exibição de uma coluna pelo id — cai pra "coluna removida" se ela
 * já não existe mais (cards/histórico guardam ids de colunas já excluídas). */
export function columnName(columns: BoardColumn[], columnId: string | null): string {
  if (!columnId) return 'Criado'
  return columns.find((c) => c.id === columnId)?.name ?? 'coluna removida'
}

export function columnIsDone(columns: BoardColumn[], columnId: string | null): boolean {
  if (!columnId) return false
  return columns.find((c) => c.id === columnId)?.isDone ?? false
}
