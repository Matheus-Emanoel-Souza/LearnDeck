export type ChartType = 'bar' | 'line' | 'pie'

export interface ChartRow {
  label: string
  value: number
}

export interface ChartSpec {
  type: ChartType
  title: string
  rows: ChartRow[]
}

export const CHART_COLORS = ['#7c5cf2', '#22b07d', '#dc9a2e', '#e05a6c', '#3a8fd6', '#c05cd6']

/** Corpo do fence ```chart é sempre este JSON — formato de bloco personalizado
 * documentado em docs/architecture.md. Guardado como texto simples dentro do
 * Markdown, então continua editável até fora do app. */
export function parseChartSpec(raw: string): ChartSpec | undefined {
  if (!raw.trim()) return undefined
  try {
    const data = JSON.parse(raw) as Partial<ChartSpec>
    if (!data.type || !Array.isArray(data.rows)) return undefined
    if (!['bar', 'line', 'pie'].includes(data.type)) return undefined
    const rows = data.rows
      .filter((r): r is ChartRow => typeof r?.label === 'string' && typeof r?.value === 'number')
      .slice(0, 200)
    if (rows.length === 0) return undefined
    return { type: data.type, title: data.title ?? '', rows }
  } catch {
    return undefined
  }
}

export function serializeChartSpec(spec: ChartSpec): string {
  return JSON.stringify(spec, null, 2)
}

/** Aceita linhas "rótulo, valor" (também com `;` ou tab no lugar da
 * vírgula) — cobre digitar à mão ou colar de uma planilha/tabela, sem
 * exigir formato de código. Detecta o separador de campo por linha (tab >
 * `;` > `,`) pra não confundir com vírgula decimal quando o separador
 * usado é `;` ou tab (ex.: "Química; 5,5"). */
export function parsePastedRows(text: string): ChartRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const fieldSeparator = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ','
      const [label, ...rest] = line.split(fieldSeparator).map((p) => p.trim())
      const rawValue = rest.join(fieldSeparator)
      const value = Number(fieldSeparator === ',' ? rawValue : rawValue.replace(',', '.'))
      return { label: label ?? '', value: Number.isFinite(value) ? value : 0 }
    })
    .filter((row) => row.label.length > 0)
}
