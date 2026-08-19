import { useEffect, useId, useRef, useState } from 'react'
import type { CodeBlockEditorDescriptor } from '@mdxeditor/editor'
import { useCodeBlockEditorContext } from '@mdxeditor/editor'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })

/** Editor de bloco de código ```mermaid — mostra o diagrama renderizado com
 * um botão pra alternar pro texto-fonte (sintaxe Mermaid) e editar. O texto
 * continua sendo o próprio corpo do fence no Markdown salvo. */
function MermaidEditor({ code }: { code: string }): JSX.Element {
  const { setCode } = useCodeBlockEditorContext()
  const [source, setSource] = useState(code)
  const [editing, setEditing] = useState(code.trim().length === 0)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const renderId = useId().replace(/:/g, '-')
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      if (!source.trim()) {
        setSvg('')
        setError(null)
        return
      }
      mermaid
        .render(`mermaid-${renderId}`, source)
        .then(({ svg: rendered }) => {
          setSvg(DOMPurify.sanitize(rendered, { USE_PROFILES: { svg: true, svgFilters: true } }))
          setError(null)
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
    }, 300)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [source, renderId])

  return (
    <div className="notebook-mermaid" data-lexical-decorator="true" contentEditable={false}>
      <div className="notebook-mermaid__toolbar">
        <span className="notebook-mermaid__label">Diagrama (Mermaid)</span>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            if (editing) setCode(source)
            setEditing((v) => !v)
          }}
        >
          {editing ? 'ver diagrama' : 'editar código'}
        </button>
      </div>
      {editing && (
        <textarea
          className="notebook-mermaid__source"
          rows={6}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onBlur={() => setCode(source)}
          placeholder={'graph TD\n  A[Início] --> B[Fim]'}
        />
      )}
      {!editing && error && <p className="status status--error">{error}</p>}
      {!editing && !error && svg && (
        <div className="notebook-mermaid__canvas" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      {!editing && !error && !svg && <p className="empty-hint">Diagrama vazio.</p>}
    </div>
  )
}

export const mermaidCodeBlockDescriptor: CodeBlockEditorDescriptor = {
  priority: 10,
  match: (language) => language === 'mermaid',
  Editor: MermaidEditor
}
