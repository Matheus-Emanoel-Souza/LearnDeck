/**
 * Combina dueDate ('YYYY-MM-DD') + dueTime opcional ('HH:MM') num datetime
 * local ISO-like ('YYYY-MM-DDTHH:MM:SS'), usado tanto pra comparar com "agora"
 * (vencido/não) quanto como chave de deduplicação de notificação. Sem
 * horário, o prazo vence no fim do dia (23:59:59) local — respeita o fuso do
 * sistema porque `new Date('YYYY-MM-DDTHH:MM:SS')` (sem "Z") é interpretado
 * como hora local pelo próprio JS.
 */
export function combineDueAt(dueDate: string, dueTime: string | null): string {
  return `${dueDate}T${dueTime ?? '23:59'}:00`
}

export function isOverdue(dueDate: string, dueTime: string | null, now: Date = new Date()): boolean {
  return new Date(combineDueAt(dueDate, dueTime)) <= now
}
