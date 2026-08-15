import { useEffect, useState } from 'react'
import type { CardStatus, DashboardSummary } from '@shared/types'
import { CARD_STATUSES, CARD_STATUS_LABELS } from '@shared/types'
import { formatDurationLong } from '../lib/formatDate'

interface DashboardProps {
  workspaceId: string
}

// Paleta categórica validada (dataviz skill) — ordem fixa, não trocar por
// card/status: slots 1–6 do tema padrão, na ordem em que os status aparecem
// no fluxo do Kanban.
const STATUS_COLORS: Record<CardStatus, string> = {
  backlog: '#2a78d6',
  to_study: '#eb6834',
  studying: '#1baf7a',
  paused: '#eda100',
  review: '#e87ba4',
  done: '#008300'
}

const AGGREGATE_COLORS = {
  open: '#2a78d6',
  inProgress: '#eb6834',
  done: '#1baf7a'
} as const

export default function Dashboard({ workspaceId }: DashboardProps): JSX.Element {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.dashboard
      .getSummary(workspaceId)
      .then(setSummary)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [workspaceId])

  if (error) return <p className="status status--error">{error}</p>
  if (!summary) return <p className="empty-hint">Carregando dashboard…</p>

  const maxStatusCount = Math.max(1, ...CARD_STATUSES.map((s) => summary.byStatus[s]))
  const aggregateTotal = Math.max(1, summary.totalCards)

  return (
    <div className="dashboard">
      <div className="stat-tile-row">
        <div className="stat-tile">
          <span className="stat-tile__label">Total de cards</span>
          <span className="stat-tile__value">{summary.totalCards}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Horas estudadas</span>
          <span className="stat-tile__value">{formatDurationLong(summary.totalStudySeconds)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Pomodoros concluídos</span>
          <span className="stat-tile__value">{summary.totalPomodoros}</span>
        </div>
      </div>

      <section className="card-section">
        <h3>Cards por andamento</h3>

        {summary.totalCards === 0 ? (
          <p className="empty-hint">Nenhum card criado ainda.</p>
        ) : (
          <>
            <div className="stacked-bar" role="img" aria-label="Proporção de cards por andamento">
              {summary.openCount > 0 && (
                <div
                  className="stacked-bar__segment"
                  style={{ width: `${(summary.openCount / aggregateTotal) * 100}%`, background: AGGREGATE_COLORS.open }}
                >
                  {summary.openCount}
                </div>
              )}
              {summary.inProgressCount > 0 && (
                <div
                  className="stacked-bar__segment"
                  style={{
                    width: `${(summary.inProgressCount / aggregateTotal) * 100}%`,
                    background: AGGREGATE_COLORS.inProgress
                  }}
                >
                  {summary.inProgressCount}
                </div>
              )}
              {summary.doneCount > 0 && (
                <div
                  className="stacked-bar__segment"
                  style={{ width: `${(summary.doneCount / aggregateTotal) * 100}%`, background: AGGREGATE_COLORS.done }}
                >
                  {summary.doneCount}
                </div>
              )}
            </div>

            <ul className="chart-legend">
              <li>
                <span className="chart-legend__swatch" style={{ background: AGGREGATE_COLORS.open }} />
                Aberto ({summary.openCount})
              </li>
              <li>
                <span className="chart-legend__swatch" style={{ background: AGGREGATE_COLORS.inProgress }} />
                Em andamento ({summary.inProgressCount})
              </li>
              <li>
                <span className="chart-legend__swatch" style={{ background: AGGREGATE_COLORS.done }} />
                Concluído ({summary.doneCount})
              </li>
            </ul>
          </>
        )}
      </section>

      <section className="card-section">
        <h3>Cards por status</h3>
        <div className="bar-chart">
          {CARD_STATUSES.map((status) => {
            const count = summary.byStatus[status]
            const widthPct = (count / maxStatusCount) * 100
            return (
              <div key={status} className="bar-chart__row">
                <span className="bar-chart__label">{CARD_STATUS_LABELS[status]}</span>
                <div className="bar-chart__track">
                  <div
                    className="bar-chart__fill"
                    style={{ width: `${widthPct}%`, background: STATUS_COLORS[status] }}
                  />
                </div>
                <span className="bar-chart__value">{count}</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
