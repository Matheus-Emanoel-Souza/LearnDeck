import { useState } from 'react'
import type { DirectiveDescriptor } from '@mdxeditor/editor'
import type { TextDirective } from 'mdast-util-directive'
import { toString as mdastToString } from 'mdast-util-to-string'

/** Palavra-chave `:tag[nome]` (ver hashtagTransform.ts) — chip colorido
 * clicável. Clicar entra em edição rápida do nome; fora disso é só um span,
 * sem custo de interação nenhuma com o resto do texto. */
export const TagDirectiveDescriptor: DirectiveDescriptor<TextDirective> = {
  name: 'tag',
  testNode: (node) => node.type === 'textDirective' && node.name === 'tag',
  attributes: [],
  hasChildren: false,
  type: 'textDirective',
  Editor: ({ mdastNode, lexicalNode, parentEditor }) => {
    const word = mdastToString(mdastNode)
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(word)

    function commit(): void {
      const next = value.trim().replace(/\s+/g, '-')
      if (next) {
        parentEditor.update(() => {
          lexicalNode.setMdastNode({ ...mdastNode, children: [{ type: 'text', value: next }] })
        })
      }
      setEditing(false)
    }

    return editing ? (
      <input
        autoFocus
        className="notebook-tag notebook-tag--editing"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    ) : (
      <span className="notebook-tag" onClick={() => setEditing(true)} title="Clique para editar">
        #{word}
      </span>
    )
  }
}
