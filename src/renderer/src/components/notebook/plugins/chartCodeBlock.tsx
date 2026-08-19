import { useMemo, useState } from 'react'
import type { CodeBlockEditorDescriptor } from '@mdxeditor/editor'
import { useCodeBlockEditorContext } from '@mdxeditor/editor'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import ChartDataDialog from './ChartDataDialog'
import type { ChartSpec } from './chartSpec'
import { CHART_COLORS, parseChartSpec, serializeChartSpec } from './chartSpec'

/** Editor de bloco de código ```chart — o corpo do fence guarda um JSON
 * (tipo + linhas de dados), editável em texto puro no modo Markdown e, no
 * modo visual, por um formulário simples (ver ChartDataDialog). Nunca exige
 * escrever código pra montar o gráfico. */
function ChartEditor({ code }: { code: string }): JSX.Element {
  const { setCode } = useCodeBlockEditorContext()
  const [editingData, setEditingData] = useState(false)
  const spec = useMemo(() => parseChartSpec(code), [code])

  function handleApply(next: ChartSpec): void {
    setCode(serializeChartSpec(next))
    setEditingData(false)
  }

  if (!spec) {
    return (
      <div className="notebook-chart" contentEditable={false}>
        <p className="status status--error">Dados do gráfico inválidos ou vazios.</p>
        <button type="button" className="secondary-button" onClick={() => setEditingData(true)}>
          Configurar gráfico
        </button>
        {editingData && (
          <ChartDataDialog
            initial={undefined}
            onCancel={() => setEditingData(false)}
            onSave={handleApply}
          />
        )}
      </div>
    )
  }

  return (
    <div className="notebook-chart" contentEditable={false}>
      <div className="notebook-chart__toolbar">
        <span className="notebook-chart__label">{spec.title || 'Gráfico'}</span>
        <button type="button" className="link-button" onClick={() => setEditingData(true)}>
          editar dados
        </button>
      </div>
      <div className="notebook-chart__canvas">
        <ResponsiveContainer width="100%" height={260}>
          {spec.type === 'bar' ? (
            <BarChart data={spec.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS[0]} />
            </BarChart>
          ) : spec.type === 'line' ? (
            <LineChart data={spec.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} />
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={spec.rows} dataKey="value" nameKey="label" outerRadius={90} label>
                {spec.rows.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      {editingData && <ChartDataDialog initial={spec} onCancel={() => setEditingData(false)} onSave={handleApply} />}
    </div>
  )
}

export const chartCodeBlockDescriptor: CodeBlockEditorDescriptor = {
  priority: 10,
  match: (language) => language === 'chart',
  Editor: ChartEditor
}
