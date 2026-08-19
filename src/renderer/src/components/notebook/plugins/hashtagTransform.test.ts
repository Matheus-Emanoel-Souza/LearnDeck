import { describe, expect, it } from 'vitest'
import { collapseHashtagsForStorage, expandHashtagsForEditor } from './hashtagTransform'

describe('hashtagTransform', () => {
  it('expande #palavra pra :tag[palavra] fora de código', () => {
    expect(expandHashtagsForEditor('Ver #frontend e #banco-de-dados.')).toBe(
      'Ver :tag[frontend] e :tag[banco-de-dados].'
    )
  })

  it('faz o round-trip completo (expand -> collapse) sem alterar o texto', () => {
    const original = 'Card #urgente relacionado a #frontend e #banco.'
    expect(collapseHashtagsForStorage(expandHashtagsForEditor(original))).toBe(original)
  })

  it('não mexe em # dentro de bloco de código', () => {
    const markdown = '```sql\nSELECT * FROM t WHERE id = #123 -- comentário\n```\nFora: #urgente'
    const expanded = expandHashtagsForEditor(markdown)
    expect(expanded).toContain('SELECT * FROM t WHERE id = #123')
    expect(expanded).toContain(':tag[urgente]')
  })

  it('não mexe em # dentro de código inline (crases)', () => {
    const markdown = 'Use `#define X` no código, mas marque #importante fora.'
    const expanded = expandHashtagsForEditor(markdown)
    expect(expanded).toContain('`#define X`')
    expect(expanded).toContain(':tag[importante]')
  })

  it('não converte # no meio de uma palavra (ex.: C#)', () => {
    expect(expandHashtagsForEditor('Linguagem C#avançado')).toBe('Linguagem C#avançado')
  })
})
