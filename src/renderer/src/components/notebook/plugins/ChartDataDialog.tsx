import { useState } from 'react'
import type { ChartRow, ChartSpec, ChartType } from './chartSpec'
import { parsePastedRows } from './chartSpec'

interface ChartDataDialogProps {
  initial: ChartSpec | undefined
  onSave: (spec: ChartSpec) => void
  onCancel: () => void
}

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: 'Barras',
  line: 'Linha',
  pie: 'Pizza'
}

function rowsToText(rows: ChartRow[]): string {
  return rows.map((r) => `${r.label}, ${r.value}`).join('\n')
}

/** Janela simples pra montar um gráfico sem escrever código: escolhe o tipo,
 * digita título e cola/preenche linhas "rótulo, valor" (uma por linha — dá
 * pra colar direto de uma planilha). Usada pelo bloco ```chart e pelo
 * comando /grafico — ver chartCodeBlock.tsx e slashMenu.tsx. */
export default function ChartDataDialog({ initial, onSave, onCancel }: ChartDataDialogProps): JSX.Element {
  const [type, setType] = useState<ChartType>(initial?.type ?? 'bar')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [rowsText, setRowsText] = useState(initial ? rowsToText(initial.rows) : '')

  const rows = parsePastedRows(rowsText)

  function handleSave(): void {
    if (rows.length === 0) return
    onSave({ type, title: title.trim(), rows })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" style={{ width: 'min(480px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <h2>{initial ? 'Editar gráfico' : 'Inserir gráfico'}</h2>
        </div>
        <div className="modal-panel__body">
          <div className="modal-section">
            <h3>Tipo</h3>
            <div className="modal-section__row">
              <select value={type} onChange={(e) => setType(e.target.value as ChartType)}>
                {(Object.keys(CHART_TYPE_LABELS) as ChartType[]).map((t) => (
                  <option key={t} value={t}>
                    {CHART_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-section">
            <h3>Título (opcional)</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Horas por matéria" />
          </div>
          <div className="modal-section">
            <h3>Dados</h3>
            <p className="modal-section__label">Uma linha por item: rótulo, valor. Dá pra colar de uma planilha.</p>
            <textarea
              className="modal-section__textarea"
              rows={8}
              value={rowsText}
              onChange={(e) => setRowsText(e.target.value)}
              placeholder={'Cálculo, 12\nFísica, 8\nQuímica, 5'}
            />
            {rowsText.trim() && rows.length === 0 && (
              <p className="status status--error">Nenhuma linha válida reconhecida.</p>
            )}
          </div>
          <div className="modal-section__row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-button" onClick={onCancel}>
              Cancelar
            </button>
            <button type="button" className="primary-button" disabled={rows.length === 0} onClick={handleSave}>
              {initial ? 'Salvar' : 'Inserir gráfico'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
