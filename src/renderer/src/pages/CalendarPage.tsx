import { useEffect, useMemo, useState } from 'react'
import type { CalendarItem } from '@shared/types'
import { getDueStatus, DUE_STATUS_LABELS } from '../lib/dueStatus'

interface CalendarPageProps {
  workspaceId: string
  onOpenCard: (cardId: string) => void
}

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Dias da grade do mês (inclui os do mês anterior/seguinte pra fechar as
 * semanas), cada um já com seus CalendarItem[] resolvidos. */
function buildMonthGrid(monthStart: Date, items: CalendarItem[]): Array<{ date: Date; inMonth: boolean; items: CalendarItem[] }> {
  const byDate = new Map<string, CalendarItem[]>()
  for (const item of items) {
    const list = byDate.get(item.dueDate) ?? []
    list.push(item)
    byDate.set(item.dueDate, list)
  }

  const firstWeekday = monthStart.getDay()
  const gridStart = new Date(monthStart)
  gridStart.setDate(gridStart.getDate() - firstWeekday)

  const days: Array<{ date: Date; inMonth: boolean; items: CalendarItem[] }> = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart)
    d.setDate(d.getDate() + i)
    days.push({ date: d, inMonth: d.getMonth() === monthStart.getMonth(), items: byDate.get(toIsoDate(d)) ?? [] })
  }
  return days
}

/**
 * Calendário mensal: cards e subtarefas com prazo, diferenciados
 * visualmente (quadrado = ticket, bolinha = subtarefa) e coloridos por
 * status (vencido/próximo/concluído/normal). Clique num item mostra os
 * detalhes e permite abrir o ticket direto.
 */
export default function CalendarPage({ workspaceId, onOpenCard }: CalendarPageProps): JSX.Element {
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [items, setItems] = useState<CalendarItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CalendarItem | null>(null)

  useEffect(() => {
    window.api.calendar
      .getItems(workspaceId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [workspaceId])

  const grid = useMemo(() => buildMonthGrid(monthStart, items), [monthStart, items])
  const today = toIsoDate(new Date())

  function changeMonth(delta: number): void {
    setMonthStart((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  return (
    <div className="dashboard">
      <section className="card-section">
        <div className="calendar-page__header">
          <button className="secondary-button" onClick={() => changeMonth(-1)}>
            ← Mês anterior
          </button>
          <h3>
            {MONTH_LABELS[monthStart.getMonth()]} de {monthStart.getFullYear()}
          </h3>
          <button className="secondary-button" onClick={() => changeMonth(1)}>
            Próximo mês →
          </button>
        </div>

        {error && <p className="status status--error">{error}</p>}

        <div className="calendar-grid">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="calendar-grid__weekday">
              {w}
            </div>
          ))}

          {grid.map(({ date, inMonth, items: dayItems }) => {
            const iso = toIsoDate(date)
            return (
              <div
                key={iso}
                className={`calendar-grid__day ${inMonth ? '' : 'calendar-grid__day--outside'} ${
                  iso === today ? 'calendar-grid__day--today' : ''
                }`}
              >
                <span className="calendar-grid__day-number">{date.getDate()}</span>
                <div className="calendar-grid__items">
                  {dayItems.map((item) => {
                    const status = getDueStatus(item.dueDate, item.dueTime, item.isDone) ?? 'ok'
                    return (
                      <button
                        key={item.id}
                        className={`calendar-item calendar-item--${item.kind} calendar-item--${status}`}
                        title={item.title}
                        onClick={() => setSelected(item)}
                      >
                        {item.title}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <ul className="chart-legend">
          <li>
            <span className="calendar-item calendar-item--card calendar-item--ok" style={{ width: 14, padding: 0 }} />
            Ticket
          </li>
          <li>
            <span className="calendar-item calendar-item--subtask calendar-item--ok" style={{ width: 14, padding: 0 }} />
            Subtarefa
          </li>
          <li>
            <span className="chart-legend__swatch calendar-item--overdue" /> Vencido
          </li>
          <li>
            <span className="chart-legend__swatch calendar-item--due-soon" /> Próximo do vencimento
          </li>
          <li>
            <span className="chart-legend__swatch calendar-item--done" /> Concluído
          </li>
        </ul>
      </section>

      {selected && (
        <div className="calendar-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selected.title}</h3>
            <p>
              <strong>Tipo:</strong> {selected.kind === 'subtask' ? 'Subtarefa' : 'Ticket'}
            </p>
            <p>
              <strong>Prazo:</strong> {selected.dueDate.split('-').reverse().join('/')}
              {selected.dueTime ? ` às ${selected.dueTime}` : ''}
            </p>
            <p>
              <strong>Status:</strong>{' '}
              {DUE_STATUS_LABELS[getDueStatus(selected.dueDate, selected.dueTime, selected.isDone) ?? 'ok']}
            </p>
            {selected.kind === 'subtask' && (
              <p>
                <strong>Ticket relacionado:</strong> {selected.cardTitle}
              </p>
            )}
            <div className="calendar-modal__actions">
              <button className="primary-button" onClick={() => onOpenCard(selected.cardId)}>
                Abrir ticket
              </button>
              <button className="secondary-button" onClick={() => setSelected(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
