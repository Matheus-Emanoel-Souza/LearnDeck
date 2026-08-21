import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { MDXEditor } from '@mdxeditor/editor'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import type { Notebook, NotebookVersion } from '@shared/types'
import { buildNotebookPlugins } from './notebookEditorConfig'
import { collapseHashtagsForStorage, expandHashtagsForEditor } from './plugins/hashtagTransform'
import { isWebBuild } from '../../lib/platform'
import { watchLdattachImages } from '../../lib/attachmentImageResolver'
import TemplatePicker from './TemplatePicker'
import SaveIndicator from './SaveIndicator'
import type { SaveState } from './SaveIndicator'
import VersionHistoryPanel from './VersionHistoryPanel'
import NotebookToc from './NotebookToc'
import { BLANK_NOTEBOOK_MARKDOWN, TECHNICAL_TEMPLATE_MARKDOWN } from './templates'

const AUTOSAVE_DEBOUNCE_MS = 1200

interface CardNotebookProps {
  cardId: string
  workspaceId: string
  onNavigateToCard: (cardId: string) => void
}

/**
 * Caderno do card: documentação técnica em Markdown com editor visual
 * (MDXEditor). Ver docs/architecture.md para a extensão de blocos
 * personalizados (mermaid, gráfico, math, detalhes, tags, link de ticket) e
 * o esquema de trava otimista usado no autosave.
 */
export default function CardNotebook({ cardId, workspaceId, onNavigateToCard }: CardNotebookProps): JSX.Element {
  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [editorMarkdown, setEditorMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<NotebookVersion[]>([])

  const editorRef = useRef<MDXEditorMethods>(null)
  const contentWrapperRef = useRef<HTMLDivElement>(null)
  const imageButtonWrapperRef = useRef<HTMLSpanElement>(null)
  const debounceRef = useRef<number | null>(null)
  const pendingContentRef = useRef<string | null>(null)
  const baseVersionRef = useRef(1)

  const plugins = useMemo(
    () => buildNotebookPlugins({ workspaceId, cardId, imageButtonWrapperRef }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardId, workspaceId]
  )

  useEffect(() => {
    setLoading(true)
    setError(null)
    setShowTemplatePicker(false)
    window.api.notebooks
      .getByCard(cardId)
      .then((nb) => {
        setNotebook(nb)
        baseVersionRef.current = nb.version
        setEditorMarkdown(expandHashtagsForEditor(nb.contentMarkdown))
        setSaveState('idle')
        if (!nb.contentMarkdown.trim()) setShowTemplatePicker(true)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [cardId])

  const flushSave = useCallback(
    (content: string) => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      const stored = collapseHashtagsForStorage(content)
      setSaveState('saving')
      window.api.notebooks
        .save({ cardId, contentMarkdown: stored, baseVersion: baseVersionRef.current })
        .then((result) => {
          if (result.status === 'conflict') {
            setSaveState('conflict')
            return
          }
          baseVersionRef.current = result.notebook.version
          setNotebook(result.notebook)
          setSaveState('saved')
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : String(err))
          setSaveState('error')
        })
    },
    [cardId]
  )

  function scheduleSave(content: string): void {
    pendingContentRef.current = content
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      if (pendingContentRef.current !== null) flushSave(pendingContentRef.current)
    }, AUTOSAVE_DEBOUNCE_MS)
  }

  // Não perde conteúdo se o usuário sair da tela do card enquanto o debounce
  // ainda não disparou — força o save pendente no unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current && pendingContentRef.current !== null) {
        window.clearTimeout(debounceRef.current)
        flushSave(pendingContentRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId])

  // Build web: imagens do caderno são salvas como `ldattach://...` (mesmo
  // texto do build desktop), mas o navegador não resolve esse esquema
  // sozinho — ver attachmentImageResolver.ts.
  useEffect(() => {
    if (!isWebBuild() || !contentWrapperRef.current) return
    return watchLdattachImages(contentWrapperRef.current)
  }, [cardId, editorMarkdown])

  function handleChange(markdown: string, initialNormalize: boolean): void {
    if (initialNormalize) return
    setEditorMarkdown(markdown)
    scheduleSave(markdown)
  }

  function handlePickTemplate(kind: 'blank' | 'technical'): void {
    const content = kind === 'technical' ? TECHNICAL_TEMPLATE_MARKDOWN : BLANK_NOTEBOOK_MARKDOWN
    setShowTemplatePicker(false)
    setEditorMarkdown(expandHashtagsForEditor(content))
    editorRef.current?.setMarkdown(expandHashtagsForEditor(content))
    flushSave(content)
  }

  function handleOpenHistory(): void {
    window.api.notebooks
      .listVersions(cardId)
      .then((list) => {
        setVersions(list)
        setShowHistory(true)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }

  function handleRestoreVersion(version: number): void {
    window.api.notebooks
      .restoreVersion(cardId, version, baseVersionRef.current)
      .then((result) => {
        if (result.status === 'conflict') {
          setSaveState('conflict')
          return
        }
        baseVersionRef.current = result.notebook.version
        setNotebook(result.notebook)
        const expanded = expandHashtagsForEditor(result.notebook.contentMarkdown)
        setEditorMarkdown(expanded)
        editorRef.current?.setMarkdown(expanded)
        setShowHistory(false)
        setSaveState('saved')
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }

  function handleReloadLatest(): void {
    window.api.notebooks.getByCard(cardId).then((nb) => {
      baseVersionRef.current = nb.version
      setNotebook(nb)
      const expanded = expandHashtagsForEditor(nb.contentMarkdown)
      setEditorMarkdown(expanded)
      editorRef.current?.setMarkdown(expanded)
      setSaveState('idle')
    })
  }

  function handleOverwriteAnyway(): void {
    if (pendingContentRef.current !== null) {
      // A versão que o outro save escreveu já foi devolvida no conflito
      // anterior — usa ela como base pra não perder a trava de novo.
      window.api.notebooks.getByCard(cardId).then((nb) => {
        baseVersionRef.current = nb.version
        flushSave(pendingContentRef.current!)
      })
    }
  }

  // Clique em link `[Título](card://id)` navega dentro do app em vez de
  // tentar abrir a URL (protocolo custom não é http/https).
  function handleContentClick(e: ReactMouseEvent<HTMLDivElement>): void {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href') ?? ''
    if (href.startsWith('card://')) {
      e.preventDefault()
      onNavigateToCard(href.replace('card://', ''))
    }
  }

  if (loading) return <p className="empty-hint">Carregando caderno…</p>
  if (error) return <p className="status status--error">{error}</p>

  return (
    <div className="notebook">
      <div className="notebook__header">
        <SaveIndicator state={saveState} updatedAt={notebook?.updatedAt ?? null} />
        <button type="button" className="link-button" onClick={handleOpenHistory}>
          Histórico de versões
        </button>
      </div>

      {saveState === 'conflict' && (
        <div className="notebook__conflict-banner">
          <p>Este caderno foi salvo por outra janela enquanto você editava.</p>
          <button className="secondary-button" onClick={handleReloadLatest}>
            Recarregar versão mais recente
          </button>
          <button className="secondary-button" onClick={handleOverwriteAnyway}>
            Manter minha edição (sobrescrever)
          </button>
        </div>
      )}

      {showTemplatePicker ? (
        <TemplatePicker onPick={handlePickTemplate} />
      ) : (
        <div className="notebook__layout">
          <div className="notebook__editor" ref={contentWrapperRef} onClick={handleContentClick}>
            <MDXEditor
              key={cardId}
              ref={editorRef}
              markdown={editorMarkdown}
              onChange={handleChange}
              plugins={plugins}
              className="light-theme"
              contentEditableClassName="notebook__content"
              placeholder="Escreva a documentação técnica deste ticket…"
            />
          </div>
          <NotebookToc markdown={editorMarkdown} contentRef={contentWrapperRef} />
        </div>
      )}

      {showHistory && (
        <VersionHistoryPanel versions={versions} onRestore={handleRestoreVersion} onClose={() => setShowHistory(false)} />
      )}
    </div>
  )
}
