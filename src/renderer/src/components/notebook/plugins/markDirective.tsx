import type { TextDirective } from 'mdast-util-directive'
import type { DirectiveDescriptor } from '@mdxeditor/editor'
import { NestedLexicalEditor } from '@mdxeditor/editor'

/** Texto grifado/destacado: `:mark[texto]` — vira um `<mark>` de verdade,
 * editável por dentro (o conteúdo continua Markdown normal, então pode ter
 * negrito etc. dentro do grifo). */
export const MarkDirectiveDescriptor: DirectiveDescriptor<TextDirective> = {
  name: 'mark',
  testNode: (node) => node.type === 'textDirective' && node.name === 'mark',
  attributes: [],
  hasChildren: true,
  type: 'textDirective',
  Editor: () => (
    <mark className="notebook-highlight">
      <NestedLexicalEditor<TextDirective>
        getContent={(node) => node.children}
        getUpdatedMdastNode={(node, children) => ({ ...node, children }) as TextDirective}
      />
    </mark>
  )
}
