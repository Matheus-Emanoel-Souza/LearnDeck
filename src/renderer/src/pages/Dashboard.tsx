import { useEffect, useState } from 'react'
import type { DashboardSummary } from '@shared/types'
import { formatDurationLong, formatWeekdayShort } from '../lib/formatDate'

interface DashboardProps {
  workspaceId: string
}

const AGGREGATE_COLORS = {
  open: '#2a78d6',
  done: '#1baf7a'
} as const

// Paleta categórica validada (dataviz skill), ciclada por posição da coluna
// (as colunas são dinâmicas agora, não dá pra fixar cor por nome).
const SUBJECT_COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948'
]

const MAX_PIE_SLICES = 7

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
}

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

  const maxColumnCount = Math.max(1, ...summary.byColumn.map((c) => c.count))
  const aggregateTotal = Math.max(1, summary.totalCards)

  // Pizza: matérias com mais cards abertos primeiro; além do teto de slots,
  // o resto dobra em "Outras" — nunca gera uma 9ª cor (ver skill de dataviz).
  const subjectsSorted = [...summary.openCardsBySubject].sort((a, b) => b.openCount - a.openCount)
  const subjectSlices =
    subjectsSorted.length > MAX_PIE_SLICES
      ? [
          ...subjectsSorted.slice(0, MAX_PIE_SLICES),
          {
            groupId: '__other__',
            groupName: 'Outras',
            openCount: subjectsSorted.slice(MAX_PIE_SLICES).reduce((sum, s) => sum + s.openCount, 0)
          }
        ]
      : subjectsSorted
  const subjectTotal = Math.max(1, subjectSlices.reduce((sum, s) => sum + s.openCount, 0))

  // Linha: últimos 7 dias em um plano de 320x120, com eixo e rótulos de dia.
  const trend = summary.cardsOpenedByDay
  const trendMax = Math.max(1, ...trend.map((d) => d.count))
  const chartW = 320
  const chartH = 120
  const padTop = 16
  const padBottom = 20
  const padX = 14
  const plotW = chartW - padX * 2
  const plotH = chartH - padTop - padBottom
  const stepX = trend.length > 1 ? plotW / (trend.length - 1) : 0
  const trendPoints = trend.map((d, i) => ({
    x: padX + stepX * i,
    y: padTop + plotH - (d.count / trendMax) * plotH,
    date: d.date,
    count: d.count
  }))
  const trendLinePath = trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const baselineY = padTop + plotH
  const lastPoint = trendPoints[trendPoints.length - 1]

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
          {summary.byColumn.map((column, i) => {
            const widthPct = (column.count / maxColumnCount) * 100
            return (
              <div key={column.columnId} className="bar-chart__row">
                <span className="bar-chart__label">{column.columnName}</span>
                <div className="bar-chart__track">
                  <div
                    className="bar-chart__fill"
                    style={{ width: `${widthPct}%`, background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}
                  />
                </div>
                <span className="bar-chart__value">{column.count}</span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="dashboard-charts-row">
        <section className="card-section">
          <h3>Cards abertos por matéria</h3>
          {subjectSlices.length === 0 ? (
            <p className="empty-hint">Nenhum card aberto no momento.</p>
          ) : (
            <div className="pie-chart-row">
              <svg viewBox="0 0 160 160" className="pie-chart" role="img" aria-label="Cards abertos por matéria">
                {subjectSlices.length === 1 ? (
                  <circle cx={80} cy={80} r={70} fill={SUBJECT_COLORS[0]}>
                    <title>{`${subjectSlices[0].groupName}: ${subjectSlices[0].openCount}`}</title>
                  </circle>
                ) : (
                  subjectSlices.reduce<{ angle: number; nodes: JSX.Element[] }>(
                    (acc, slice, i) => {
                      const sliceAngle = (slice.openCount / subjectTotal) * 360
                      const path = describeArc(80, 80, 70, acc.angle, acc.angle + sliceAngle)
                      const pct = Math.round((slice.openCount / subjectTotal) * 100)
                      acc.nodes.push(
                        <path
                          key={slice.groupId}
                          d={path}
                          fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                          stroke="var(--bg-elevated)"
                          strokeWidth={2}
                        >
                          <title>{`${slice.groupName}: ${slice.openCount} (${pct}%)`}</title>
                        </path>
                      )
                      acc.angle += sliceAngle
                      return acc
                    },
                    { angle: 0, nodes: [] }
                  ).nodes
                )}
              </svg>
              <ul className="chart-legend chart-legend--column">
                {subjectSlices.map((slice, i) => (
                  <li key={slice.groupId}>
                    <span
                      className="chart-legend__swatch"
                      style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}
                    />
                    {slice.groupName} ({slice.openCount})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card-section">
          <h3>Cards abertos ao longo da semana</h3>
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="line-chart"
            role="img"
            aria-label="Cards abertos por dia, últimos 7 dias"
          >
            <text x={padX} y={padTop - 4} className="line-chart__day-label">
              {trendMax}
            </text>
            <line x1={padX} y1={baselineY} x2={chartW - padX} y2={baselineY} className="line-chart__axis" />
            <path d={trendLinePath} className="line-chart__line" />
            {trendPoints.map((p) => (
              <g key={p.date}>
                <circle cx={p.x} cy={p.y} r={4} className="line-chart__dot">
                  <title>{`${formatWeekdayShort(p.date)}: ${p.count} card${p.count === 1 ? '' : 's'}`}</title>
                </circle>
                <text x={p.x} y={chartH - 4} className="line-chart__day-label" textAnchor="middle">
                  {formatWeekdayShort(p.date)}
                </text>
              </g>
            ))}
            {lastPoint && (
              <text
                x={lastPoint.x}
                y={Math.max(9, lastPoint.y - 8)}
                textAnchor="middle"
                className="line-chart__value-label"
              >
                {lastPoint.count}
              </text>
            )}
          </svg>
        </section>
      </div>
    </div>
  )
}
