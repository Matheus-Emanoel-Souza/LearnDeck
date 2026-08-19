import { describe, expect, it } from 'vitest'
import { parseChartSpec, parsePastedRows, serializeChartSpec } from './chartSpec'

describe('chartSpec', () => {
  it('faz o round-trip parse -> serialize sem perder dados', () => {
    const spec = { type: 'bar' as const, title: 'Horas por matéria', rows: [{ label: 'Cálculo', value: 12 }] }
    const parsed = parseChartSpec(serializeChartSpec(spec))
    expect(parsed).toEqual(spec)
  })

  it('rejeita JSON inválido ou incompleto', () => {
    expect(parseChartSpec('')).toBeUndefined()
    expect(parseChartSpec('{"type":"bar"}')).toBeUndefined()
    expect(parseChartSpec('não é json')).toBeUndefined()
    expect(parseChartSpec('{"type":"pizza","rows":[]}')).toBeUndefined()
  })

  it('filtra linhas com label ou value inválido', () => {
    const spec = parseChartSpec(JSON.stringify({ type: 'line', rows: [{ label: 'A', value: 1 }, { label: 'B' }] }))
    expect(spec?.rows).toEqual([{ label: 'A', value: 1 }])
  })

  it('parsePastedRows aceita vírgula, ponto e vírgula e tab, e vírgula decimal', () => {
    expect(parsePastedRows('Cálculo, 12\nFísica; 8\nQuímica\t5,5')).toEqual([
      { label: 'Cálculo', value: 12 },
      { label: 'Física', value: 8 },
      { label: 'Química', value: 5.5 }
    ])
  })

  it('parsePastedRows ignora linhas em branco e sem rótulo', () => {
    expect(parsePastedRows('\n, 10\nA, 1\n')).toEqual([{ label: 'A', value: 1 }])
  })
})
