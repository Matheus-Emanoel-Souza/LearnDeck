import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  addTopAreaChild$,
  applyListType$,
  convertSelectionToNode$,
  editorRootElementRef$,
  insertCodeBlock$,
  insertDirective$,
  insertMarkdown$,
  insertTable$,
  insertThematicBreak$,
  realmPlugin,
  useCellValue,
  usePublisher
} from '@mdxeditor/editor'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import type { HeadingTagType } from '@lexical/rich-text'
import ChartDataDialog from './ChartDataDialog'
import { serializeChartSpec } from './chartSpec'
import { useCardLinkInserter } from './cardLink'

interface SlashCommand {
  id: string
  label: string
  hint: string
  keywords: string
  run: (ctx: SlashCommandContext) => void
}

interface SlashCommandContext {
  convertToNode: (factory: () => import('lexical').ElementNode) => void
  applyList: (type: 'bullet' | 'number' | 'check') => void
  insertTable: (rows: number, columns: number) => void
  insertThematicBreak: () => void
  insertCodeBlock: (language: string, code?: string) => void
  insertDirective: (name: string, type: 'containerDirective' | 'leafDirective', attributes?: Record<string, string>) => void
  insertMarkdown: (md: string) => void
  openChartDialog: () => void
  openCardLinkDialog: () => void
  clickImageButton: () => void
}

const ADMONITION_MAP: Record<string, string> = {
  info: 'info',
  aviso: 'caution',
  erro: 'danger',
  sucesso: 'tip'
}

const COMMANDS: SlashCommand[] = [
  { id: 'h1', label: 'Título 1', hint: '# ', keywords: 'titulo h1 heading', run: (c) => c.convertToNode(() => $createHeadingNode('h1' as HeadingTagType)) },
  { id: 'h2', label: 'Título 2', hint: '## ', keywords: 'titulo h2 subtitulo', run: (c) => c.convertToNode(() => $createHeadingNode('h2' as HeadingTagType)) },
  { id: 'h3', label: 'Título 3', hint: '### ', keywords: 'titulo h3 subtitulo', run: (c) => c.convertToNode(() => $createHeadingNode('h3' as HeadingTagType)) },
  { id: 'bullet', label: 'Lista com marcadores', hint: '- ', keywords: 'lista marcadores bullet', run: (c) => c.applyList('bullet') },
  { id: 'number', label: 'Lista numerada', hint: '1. ', keywords: 'lista numerada ordenada', run: (c) => c.applyList('number') },
  { id: 'check', label: 'Checklist', hint: '[ ] ', keywords: 'checklist tarefa checkbox', run: (c) => c.applyList('check') },
  { id: 'quote', label: 'Citação', hint: '> ', keywords: 'citacao quote', run: (c) => c.convertToNode(() => $createQuoteNode()) },
  { id: 'highlight', label: 'Texto destacado', hint: ':mark[]', keywords: 'destaque grifo highlight marcar', run: (c) => c.insertMarkdown(':mark[texto]') },
  { id: 'table', label: 'Tabela', hint: '', keywords: 'tabela table', run: (c) => c.insertTable(3, 3) },
  { id: 'divider', label: 'Linha separadora', hint: '---', keywords: 'linha separador divisor hr', run: (c) => c.insertThematicBreak() },
  { id: 'code', label: 'Bloco de código', hint: '```', keywords: 'codigo code bloco', run: (c) => c.insertCodeBlock('text') },
  { id: 'sql', label: 'Bloco SQL', hint: '```sql', keywords: 'sql query consulta codigo', run: (c) => c.insertCodeBlock('sql') },
  {
    id: 'mermaid',
    label: 'Diagrama (Mermaid)',
    hint: '```mermaid',
    keywords: 'diagrama mermaid fluxograma',
    run: (c) => c.insertCodeBlock('mermaid', 'graph TD\n  A[Início] --> B[Fim]')
  },
  { id: 'chart', label: 'Gráfico', hint: '/grafico', keywords: 'grafico chart barra linha pizza', run: (c) => c.openChartDialog() },
  { id: 'math', label: 'Fórmula matemática', hint: '::math', keywords: 'formula math latex equacao', run: (c) => c.insertDirective('math', 'leafDirective') },
  {
    id: 'info',
    label: 'Bloco de informação',
    hint: ':::info',
    keywords: 'info informacao aviso bloco',
    run: (c) => c.insertDirective(ADMONITION_MAP.info, 'containerDirective')
  },
  {
    id: 'aviso',
    label: 'Bloco de aviso',
    hint: ':::caution',
    keywords: 'aviso atencao warning',
    run: (c) => c.insertDirective(ADMONITION_MAP.aviso, 'containerDirective')
  },
  {
    id: 'erro',
    label: 'Bloco de erro',
    hint: ':::danger',
    keywords: 'erro error danger',
    run: (c) => c.insertDirective(ADMONITION_MAP.erro, 'containerDirective')
  },
  {
    id: 'sucesso',
    label: 'Bloco de sucesso',
    hint: ':::tip',
    keywords: 'sucesso success ok',
    run: (c) => c.insertDirective(ADMONITION_MAP.sucesso, 'containerDirective')
  },
  {
    id: 'details',
    label: 'Seção recolhível',
    hint: ':::details',
    keywords: 'detalhes recolhivel colapsavel accordion',
    run: (c) => c.insertDirective('details', 'containerDirective', { title: 'Seção' })
  },
  { id: 'image', label: 'Imagem', hint: '', keywords: 'imagem foto print anexo', run: (c) => c.clickImageButton() },
  { id: 'ticket', label: 'Vincular ticket', hint: '', keywords: 'ticket card vincular relacionado', run: (c) => c.openCardLinkDialog() }
]

interface SlashMenuOverlayProps {
  workspaceId: string
  cardId: string
  imageButtonWrapperRef: RefObject<HTMLSpanElement>
}

/** Menu "/": escuta digitação dentro do editor (fora do contexto Lexical
 * interno, que o MDXEditor não expõe pra plugins de terceiros) e usa só a
 * API pública do MDXEditor (insertMarkdown$, insertTable$, applyListType$
 * etc. via usePublisher) pra executar o comando escolhido. Renderizado como
 * top-area child — dentro da árvore do editor, então os hooks funcionam. */
export function SlashMenuOverlay({ workspaceId, cardId, imageButtonWrapperRef }: SlashMenuOverlayProps): JSX.Element | null {
  const rootRef = useCellValue(editorRootElementRef$)
  const convertToNode = usePublisher(convertSelectionToNode$)
  const applyList = usePublisher(applyListType$)
  const insertTable = usePublisher(insertTable$)
  const insertThematicBreak = usePublisher(insertThematicBreak$)
  const insertCodeBlock = usePublisher(insertCodeBlock$)
  const insertDirective = usePublisher(insertDirective$)
  const insertMarkdown = usePublisher(insertMarkdown$)
  const cardLink = useCardLinkInserter(workspaceId, cardId)
  const [chartDialogOpen, setChartDialogOpen] = useState(false)

  const [state, setState] = useState<{ query: string; rect: DOMRect; slashOffset: number } | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const stateRef = useRef(state)
  stateRef.current = state

  const matches = state
    ? COMMANDS.filter((cmd) => (cmd.keywords + ' ' + cmd.label).toLowerCase().includes(state.query.toLowerCase()))
    : []

  function closeMenu(): void {
    setState(null)
    setSelectedIndex(0)
  }

  function runCommand(cmd: SlashCommand): void {
    const current = stateRef.current
    const selection = window.getSelection()
    if (current && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const deleteRange = document.createRange()
      deleteRange.setStart(range.startContainer, current.slashOffset)
      deleteRange.setEnd(range.startContainer, range.startOffset)
      selection.removeAllRanges()
      selection.addRange(deleteRange)
      document.execCommand('delete')
    }
    closeMenu()
    cmd.run({
      convertToNode,
      applyList,
      insertTable: (rows, columns) => insertTable({ rows, columns }),
      insertThematicBreak: () => insertThematicBreak(),
      insertCodeBlock: (language, code) => insertCodeBlock({ language, code: code ?? '' }),
      insertDirective: (name, type, attributes) => insertDirective({ name, type, attributes }),
      insertMarkdown,
      openChartDialog: () => setChartDialogOpen(true),
      openCardLinkDialog: cardLink.open,
      clickImageButton: () => imageButtonWrapperRef.current?.querySelector('button')?.click()
    })
  }

  useEffect(() => {
    const root = rootRef?.current
    if (!root) return

    function handleInput(): void {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return closeMenu()
      const range = selection.getRangeAt(0)
      const node = range.startContainer
      if (node.nodeType !== Node.TEXT_NODE) return closeMenu()
      const textBefore = (node.textContent ?? '').slice(0, range.startOffset)
      const slashIndex = textBefore.lastIndexOf('/')
      if (slashIndex === -1) return closeMenu()
      const charBeforeSlash = textBefore[slashIndex - 1]
      if (slashIndex > 0 && charBeforeSlash !== undefined && !/\s/.test(charBeforeSlash)) return closeMenu()
      const query = textBefore.slice(slashIndex + 1)
      if (/\s/.test(query)) return closeMenu()

      const measureRange = document.createRange()
      measureRange.setStart(node, slashIndex)
      measureRange.setEnd(node, range.startOffset)
      const rect = measureRange.getBoundingClientRect()
      setState({ query, rect, slashOffset: slashIndex })
      setSelectedIndex(0)
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (!stateRef.current) return
      const current = COMMANDS.filter((cmd) =>
        (cmd.keywords + ' ' + cmd.label).toLowerCase().includes(stateRef.current!.query.toLowerCase())
      )
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, Math.max(current.length - 1, 0)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (current.length === 0) return
        e.preventDefault()
        runCommand(current[Math.min(selectedIndex, current.length - 1)])
      }
    }

    root.addEventListener('input', handleInput)
    root.addEventListener('keydown', handleKeyDown, true)
    return () => {
      root.removeEventListener('input', handleInput)
      root.removeEventListener('keydown', handleKeyDown, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, selectedIndex])

  return (
    <>
      {state && matches.length > 0 && (
        <div
          className="notebook-slash-menu"
          style={{ top: state.rect.bottom + window.scrollY + 4, left: state.rect.left + window.scrollX }}
        >
          {matches.map((cmd, i) => (
            <button
              key={cmd.id}
              type="button"
              className={`notebook-slash-menu__item${i === selectedIndex ? ' notebook-slash-menu__item--active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                runCommand(cmd)
              }}
            >
              <span>{cmd.label}</span>
              {cmd.hint && <span className="notebook-slash-menu__hint">{cmd.hint}</span>}
            </button>
          ))}
        </div>
      )}
      {chartDialogOpen && (
        <ChartDataDialog
          initial={undefined}
          onCancel={() => setChartDialogOpen(false)}
          onSave={(spec) => {
            insertCodeBlock({ language: 'chart', code: serializeChartSpec(spec) })
            setChartDialogOpen(false)
          }}
        />
      )}
      {cardLink.dialog}
    </>
  )
}

/** Registra o SlashMenuOverlay como "top area child" — a única forma pública
 * de injetar um componente que roda dentro da árvore/realm do MDXEditor
 * (por isso os hooks usePublisher/useCellValue funcionam nele). */
export const slashMenuPlugin = realmPlugin<{
  workspaceId: string
  cardId: string
  imageButtonWrapperRef: RefObject<HTMLSpanElement>
}>({
  init(realm, params) {
    if (!params) return
    const Component = (): JSX.Element => (
      <SlashMenuOverlay
        workspaceId={params.workspaceId}
        cardId={params.cardId}
        imageButtonWrapperRef={params.imageButtonWrapperRef}
      />
    )
    realm.pub(addTopAreaChild$, Component)
  }
})
