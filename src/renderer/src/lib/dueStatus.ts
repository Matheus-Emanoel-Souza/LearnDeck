export type DueStatus = 'overdue' | 'due-soon' | 'ok' | 'done'

const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000 // 2 dias

/** Classifica um prazo pra colorir badge/calendário: concluído > vencido >
 * próximo (48h) > normal. `null` quando não tem prazo (nada a classificar). */
export function getDueStatus(
  dueDate: string | null,
  dueTime: string | null,
  isDone: boolean
): DueStatus | null {
  if (!dueDate) return null
  if (isDone) return 'done'

  const due = new Date(`${dueDate}T${dueTime ?? '23:59'}:00`)
  const now = new Date()
  if (due.getTime() < now.getTime()) return 'overdue'
  if (due.getTime() - now.getTime() <= DUE_SOON_WINDOW_MS) return 'due-soon'
  return 'ok'
}

export const DUE_STATUS_LABELS: Record<DueStatus, string> = {
  overdue: 'Vencido',
  'due-soon': 'Vence em breve',
  ok: 'No prazo',
  done: 'Concluído'
}

/** 'YYYY-MM-DD' + 'HH:MM'? -> "17/08" ou "17/08 14:30". */
export function formatDueDate(dueDate: string, dueTime: string | null): string {
  const [, month, day] = dueDate.split('-')
  const datePart = `${day}/${month}`
  return dueTime ? `${datePart} ${dueTime}` : datePart
}
