import { useState } from 'react'
import { insertCodeBlock$, insertDirective$, insertMarkdown$, usePublisher } from '@mdxeditor/editor'
import ChartDataDialog from './ChartDataDialog'
import { serializeChartSpec } from './chartSpec'
import { useCardLinkInserter } from './cardLink'

/** Botão "Gráfico" da barra de ferramentas — mesma janela de dados do
 * comando `/grafico` (ver slashMenu.tsx), sem exigir escrever código. */
export function InsertChartToolbarButton(): JSX.Element {
  const insertCodeBlock = usePublisher(insertCodeBlock$)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="mdxeditor-toolbar-button" title="Inserir gráfico" onClick={() => setOpen(true)}>
        📊
      </button>
      {open && (
        <ChartDataDialog
          initial={undefined}
          onCancel={() => setOpen(false)}
          onSave={(spec) => {
            insertCodeBlock({ language: 'chart', code: serializeChartSpec(spec) })
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

/** Botão "Fórmula" — insere uma diretiva de math em bloco já em modo edição
 * (ver mathDirectives.tsx). */
export function InsertMathToolbarButton(): JSX.Element {
  const insertDirective = usePublisher(insertDirective$)
  return (
    <button
      type="button"
      className="mdxeditor-toolbar-button"
      title="Inserir fórmula (LaTeX)"
      onClick={() => insertDirective({ name: 'math', type: 'leafDirective' })}
    >
      Σ
    </button>
  )
}

/** Botão "Destacar" — envolve a palavra "texto" com `:mark[]` (o usuário
 * edita o conteúdo depois, dentro do grifo). */
export function InsertHighlightToolbarButton(): JSX.Element {
  const insertMarkdown = usePublisher(insertMarkdown$)
  return (
    <button
      type="button"
      className="mdxeditor-toolbar-button"
      title="Destacar texto"
      onClick={() => insertMarkdown(':mark[texto]')}
    >
      ✦
    </button>
  )
}

/** Botão "Seção recolhível" — insere um `:::details`. */
export function InsertDetailsToolbarButton(): JSX.Element {
  const insertDirective = usePublisher(insertDirective$)
  return (
    <button
      type="button"
      className="mdxeditor-toolbar-button"
      title="Inserir seção recolhível"
      onClick={() => insertDirective({ name: 'details', type: 'containerDirective', attributes: { title: 'Seção' } })}
    >
      ▸
    </button>
  )
}

interface CardLinkToolbarButtonProps {
  workspaceId: string
  cardId: string
}

/** Botão "Vincular ticket" — mesmo diálogo de busca do comando `/ticket`. */
export function CardLinkToolbarButton({ workspaceId, cardId }: CardLinkToolbarButtonProps): JSX.Element {
  const { open, dialog } = useCardLinkInserter(workspaceId, cardId)
  return (
    <>
      <button type="button" className="mdxeditor-toolbar-button" title="Vincular ticket" onClick={open}>
        🔗
      </button>
      {dialog}
    </>
  )
}
