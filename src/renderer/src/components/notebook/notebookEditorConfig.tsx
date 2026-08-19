import type { RefObject } from 'react'
import {
  AdmonitionDirectiveDescriptor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  directivesPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  imagePlugin,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  quotePlugin,
  Separator,
  StrikeThroughSupSubToggles,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  type MDXEditorMethods
} from '@mdxeditor/editor'
import type { RealmPlugin } from '@mdxeditor/editor'
import { mermaidCodeBlockDescriptor } from './plugins/mermaidCodeBlock'
import { chartCodeBlockDescriptor } from './plugins/chartCodeBlock'
import { MathBlockDirectiveDescriptor, MathInlineDirectiveDescriptor } from './plugins/mathDirectives'
import { DetailsDirectiveDescriptor } from './plugins/detailsDirective'
import { TagDirectiveDescriptor } from './plugins/tagDirective'
import { MarkDirectiveDescriptor } from './plugins/markDirective'
import { makeImageUploadHandler } from './plugins/imageUpload'
import { slashMenuPlugin } from './plugins/slashMenu'
import {
  CardLinkToolbarButton,
  InsertChartToolbarButton,
  InsertDetailsToolbarButton,
  InsertHighlightToolbarButton,
  InsertMathToolbarButton
} from './plugins/toolbarButtons'

export type { MDXEditorMethods }

const CODE_BLOCK_LANGUAGES: Record<string, string> = {
  text: 'Texto',
  sql: 'SQL',
  js: 'JavaScript',
  ts: 'TypeScript',
  json: 'JSON',
  bash: 'Shell',
  python: 'Python',
  css: 'CSS',
  html: 'HTML',
  mermaid: 'Mermaid (diagrama)',
  chart: 'Gráfico'
}

interface BuildPluginsOptions {
  workspaceId: string
  cardId: string
  /** Wrapper em volta do botão nativo <InsertImage/> — o slash menu clica
   * nele pra abrir o seletor de imagem (mesmo upload handler do
   * colar/arrastar). Não dá pra passar `ref` direto pro InsertImage aqui
   * por causa de um mismatch de tipos do RefObject entre React 18 e o
   * ForwardRefExoticComponent exportado pelo MDXEditor. */
  imageButtonWrapperRef: RefObject<HTMLSpanElement>
}

/** Monta a lista de plugins do MDXEditor pro caderno do card — toda a
 * extensão específica do LearnDeck (mermaid, gráfico, math, detalhes, tags,
 * link de ticket, menu "/") mora em ./plugins. Ver docs/architecture.md
 * para a lista completa e o porquê de cada uma. */
export function buildNotebookPlugins(options: BuildPluginsOptions): RealmPlugin[] {
  const { workspaceId, cardId, imageButtonWrapperRef } = options

  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    imagePlugin({ imageUploadHandler: makeImageUploadHandler(cardId) }),
    codeBlockPlugin({ codeBlockEditorDescriptors: [mermaidCodeBlockDescriptor, chartCodeBlockDescriptor] }),
    codeMirrorPlugin({ codeBlockLanguages: CODE_BLOCK_LANGUAGES }),
    directivesPlugin({
      directiveDescriptors: [
        AdmonitionDirectiveDescriptor,
        DetailsDirectiveDescriptor,
        MathBlockDirectiveDescriptor,
        MathInlineDirectiveDescriptor,
        TagDirectiveDescriptor,
        MarkDirectiveDescriptor
      ]
    }),
    markdownShortcutPlugin(),
    slashMenuPlugin({ workspaceId, cardId, imageButtonWrapperRef }),
    diffSourcePlugin({ viewMode: 'rich-text' }),
    toolbarPlugin({
      toolbarContents: () => (
        <DiffSourceToggleWrapper options={['rich-text', 'source']}>
          <UndoRedo />
          <Separator />
          <BoldItalicUnderlineToggles />
          <StrikeThroughSupSubToggles />
          <InsertHighlightToolbarButton />
          <Separator />
          <BlockTypeSelect />
          <ListsToggle />
          <Separator />
          <CreateLink />
          <span ref={imageButtonWrapperRef} style={{ display: 'contents' }}>
            <InsertImage />
          </span>
          <InsertTable />
          <InsertThematicBreak />
          <InsertCodeBlock />
          <Separator />
          <InsertMathToolbarButton />
          <InsertChartToolbarButton />
          <InsertDetailsToolbarButton />
          <CardLinkToolbarButton workspaceId={workspaceId} cardId={cardId} />
        </DiffSourceToggleWrapper>
      )
    })
  ]
}
