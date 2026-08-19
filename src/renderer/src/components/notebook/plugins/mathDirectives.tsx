import { useState } from 'react'
import type { DirectiveDescriptor } from '@mdxeditor/editor'
import type { LeafDirective, TextDirective } from 'mdast-util-directive'
import { toString as mdastToString } from 'mdast-util-to-string'
import katex from 'katex'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return DOMPurify.sanitize(
      katex.renderToString(latex, { throwOnError: false, displayMode, output: 'html' })
    )
  } catch {
    return `<span class="notebook-math__error">${latex}</span>`
  }
}

/** Fórmula matemática em bloco: `::math[E = mc^2]` (leaf directive — sintaxe
 * de linha única, sem markdown aninhado). Clique pra editar o LaTeX. */
export const MathBlockDirectiveDescriptor: DirectiveDescriptor<LeafDirective> = {
  name: 'math',
  testNode: (node) => node.type === 'leafDirective' && node.name === 'math',
  attributes: [],
  hasChildren: false,
  type: 'leafDirective',
  Editor: ({ mdastNode, lexicalNode, parentEditor }) => {
    const latex = mdastToString(mdastNode)
    const [editing, setEditing] = useState(latex.trim().length === 0)
    const [value, setValue] = useState(latex)

    function commit(): void {
      parentEditor.update(() => {
        lexicalNode.setMdastNode({ ...mdastNode, children: [{ type: 'text', value }] })
      })
      setEditing(false)
    }

    return (
      <div className="notebook-math notebook-math--block" contentEditable={false}>
        {editing ? (
          <input
            autoFocus
            className="notebook-math__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            placeholder="Digite a fórmula (sintaxe LaTeX), ex.: E = mc^2"
          />
        ) : (
          <div
            className="notebook-math__rendered"
            onClick={() => setEditing(true)}
            dangerouslySetInnerHTML={{ __html: renderKatex(latex, true) }}
          />
        )}
      </div>
    )
  }
}

/** Fórmula matemática em linha: `:math[x^2]`, dentro do parágrafo. */
export const MathInlineDirectiveDescriptor: DirectiveDescriptor<TextDirective> = {
  name: 'math',
  testNode: (node) => node.type === 'textDirective' && node.name === 'math',
  attributes: [],
  hasChildren: false,
  type: 'textDirective',
  Editor: ({ mdastNode, lexicalNode, parentEditor }) => {
    const latex = mdastToString(mdastNode)
    const [editing, setEditing] = useState(latex.trim().length === 0)
    const [value, setValue] = useState(latex)

    function commit(): void {
      parentEditor.update(() => {
        lexicalNode.setMdastNode({ ...mdastNode, children: [{ type: 'text', value }] })
      })
      setEditing(false)
    }

    return editing ? (
      <input
        autoFocus
        className="notebook-math__input notebook-math__input--inline"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        placeholder="x^2"
      />
    ) : (
      <span
        className="notebook-math notebook-math--inline"
        onClick={() => setEditing(true)}
        dangerouslySetInnerHTML={{ __html: renderKatex(latex, false) }}
      />
    )
  }
}
