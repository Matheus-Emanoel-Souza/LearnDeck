import type { ContainerDirective } from 'mdast-util-directive'
import type { DirectiveDescriptor } from '@mdxeditor/editor'
import { NestedLexicalEditor } from '@mdxeditor/editor'

/** Seção recolhível: `:::details{title="Título"}` ... `:::`. Vira um
 * `<details>` nativo — recolhe/expande sem depender de JS do editor pra
 * exibir, então continua legível se o Markdown for aberto em outro app. */
export const DetailsDirectiveDescriptor: DirectiveDescriptor<ContainerDirective> = {
  name: 'details',
  testNode: (node) => node.type === 'containerDirective' && node.name === 'details',
  attributes: ['title'],
  hasChildren: true,
  type: 'containerDirective',
  Editor: ({ mdastNode, lexicalNode, parentEditor }) => {
    const title = mdastNode.attributes?.title ?? 'Seção'

    function commitTitle(next: string): void {
      parentEditor.update(() => {
        lexicalNode.setMdastNode({ ...mdastNode, attributes: { ...mdastNode.attributes, title: next } })
      })
    }

    return (
      <details className="notebook-details" open>
        <summary>
          <input
            className="notebook-details__title"
            value={title}
            onChange={(e) => commitTitle(e.target.value)}
            onClick={(e) => e.preventDefault()}
          />
        </summary>
        <div className="notebook-details__body">
          <NestedLexicalEditor<ContainerDirective>
            block
            getContent={(node) => node.children}
            getUpdatedMdastNode={(node, children) => ({ ...node, children }) as ContainerDirective}
          />
        </div>
      </details>
    )
  }
}
