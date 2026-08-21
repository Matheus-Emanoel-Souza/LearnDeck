import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  Attachment,
  BoardColumn,
  Card,
  CardRelationType,
  CardRelationView,
  Comment,
  StatusHistoryEntry,
  StudySession,
  Subtask,
  Tag
} from '@shared/types'
import { formatDateTime } from '../lib/formatDate'
import { columnName } from '../lib/columns'
import { getDueStatus } from '../lib/dueStatus'
import StatusBadge from '../components/StatusBadge'
import CardTimer from '../components/CardTimer'
import CardPomodoro from '../components/CardPomodoro'
import CardSessions from '../components/CardSessions'
import CardRelations from '../components/CardRelations'
import CardAttachments from '../components/CardAttachments'
import CardSubtasks from '../components/CardSubtasks'
import CardIdBadge from '../components/CardIdBadge'
import CardNotebook from '../components/notebook/CardNotebook'

export type CardDetailFocus = 'timer' | 'comment' | 'relations'

interface CardDetailPageProps {
  card: Card
  workspaceId: string
  columns: BoardColumn[]
  onBack: () => void
  onNavigateToCard: (cardId: string) => void
  onDelete: (cardId: string) => Promise<void>
  /** Seção pra rolar até e focar ao abrir — usada pelo menu de ações do card
   *  do Kanban (⋮), que só atalha pra uma seção que já existe aqui embaixo. */
  initialFocus?: CardDetailFocus | null
}

/**
 * Tela inteira dedicada ao card (não um modal): descrição, status,
 * cronômetro, Pomodoro, comentários, histórico, sessões e cards
 * relacionados. Substitui o quadro Kanban enquanto está aberta — ver
 * StudyPanel.
 */
export default function CardDetailPage({
  card: initialCard,
  workspaceId,
  columns,
  onBack,
  onNavigateToCard,
  onDelete,
  initialFocus
}: CardDetailPageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'details' | 'notebook'>('details')
  const [card, setCard] = useState(initialCard)
  const [deleting, setDeleting] = useState(false)
  const [description, setDescription] = useState(initialCard.description ?? '')
  const [descriptionDirty, setDescriptionDirty] = useState(false)
  const [savingDescription, setSavingDescription] = useState(false)

  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [showTagForm, setShowTagForm] = useState(false)

  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const [history, setHistory] = useState<StatusHistoryEntry[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [relations, setRelations] = useState<CardRelationView[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [error, setError] = useState<string | null>(null)

  const [dueDate, setDueDate] = useState(initialCard.dueDate ?? '')
  const [dueTime, setDueTime] = useState(initialCard.dueTime ?? '')
  const [dueDirty, setDueDirty] = useState(false)

  const timerSectionRef = useRef<HTMLElement>(null)
  const commentSectionRef = useRef<HTMLElement>(null)
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const relationsSectionRef = useRef<HTMLElement>(null)

  // Vindo do menu de ações (⋮) do card no Kanban: rola até a seção pedida e,
  // quando faz sentido, já coloca o foco no campo (ex.: comentário).
  useEffect(() => {
    if (!initialFocus) return
    const target =
      initialFocus === 'timer'
        ? timerSectionRef.current
        : initialFocus === 'comment'
          ? commentSectionRef.current
          : relationsSectionRef.current
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (initialFocus === 'comment') commentTextareaRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFocus, initialCard.id])
  const [savingDue, setSavingDue] = useState(false)

  const reloadSessions = useCallback(() => {
    window.api.timer
      .listByCard(card.id)
      .then(setSessions)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [card.id])

  const reloadRelations = useCallback(() => {
    window.api.relations
      .listByCard(card.id)
      .then(setRelations)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [card.id])

  useEffect(() => {
    setActiveTab('details')
    setCard(initialCard)
    setDescription(initialCard.description ?? '')
    setDescriptionDirty(false)
    setDueDate(initialCard.dueDate ?? '')
    setDueTime(initialCard.dueTime ?? '')
    setDueDirty(false)

    Promise.all([
      window.api.tags.listForCard(initialCard.id),
      window.api.comments.listByCard(initialCard.id),
      window.api.history.listByCard(initialCard.id),
      window.api.timer.listByCard(initialCard.id),
      window.api.relations.listByCard(initialCard.id),
      window.api.attachments.listByCard(initialCard.id),
      window.api.subtasks.listByCard(initialCard.id)
    ])
      .then(([tagList, commentList, historyList, sessionList, relationList, attachmentList, subtaskList]) => {
        setTags(tagList)
        setComments(commentList)
        setHistory(historyList)
        setSessions(sessionList)
        setRelations(relationList)
        setAttachments(attachmentList)
        setSubtasks(subtaskList)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCard.id])

  async function handleSaveDescription(): Promise<void> {
    setSavingDescription(true)
    try {
      setCard(await window.api.cards.update(card.id, { description: description.trim() || null }))
      setDescriptionDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingDescription(false)
    }
  }

  async function handleSaveDueDate(): Promise<void> {
    setSavingDue(true)
    try {
      setCard(
        await window.api.cards.update(card.id, {
          dueDate: dueDate || null,
          dueTime: dueDate && dueTime ? dueTime : null
        })
      )
      setDueDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingDue(false)
    }
  }

  async function handleClearDueDate(): Promise<void> {
    setDueDate('')
    setDueTime('')
    setSavingDue(true)
    try {
      setCard(await window.api.cards.update(card.id, { dueDate: null, dueTime: null }))
      setDueDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingDue(false)
    }
  }

  async function handleChangeColumn(columnId: string): Promise<void> {
    try {
      setCard(await window.api.cards.update(card.id, { columnId }))
      setHistory(await window.api.history.listByCard(card.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleAddTag(): Promise<void> {
    if (!newTagName.trim()) return
    try {
      setTags(await window.api.tags.attachToCard(card.id, newTagName))
      setNewTagName('')
      setShowTagForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleRemoveTag(tagId: string): Promise<void> {
    try {
      setTags(await window.api.tags.detachFromCard(card.id, tagId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleAddComment(): Promise<void> {
    if (!newComment.trim() || postingComment) return
    setPostingComment(true)
    try {
      await window.api.comments.create(card.id, newComment)
      setComments(await window.api.comments.listByCard(card.id))
      setNewComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPostingComment(false)
    }
  }

  async function handleAddRelation(relatedCardId: string, relationType: CardRelationType): Promise<void> {
    try {
      await window.api.relations.create({ cardId: card.id, relatedCardId, relationType })
      reloadRelations()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleRemoveRelation(id: string): Promise<void> {
    try {
      await window.api.relations.delete(id)
      reloadRelations()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDelete(): Promise<void> {
    if (deleting) return
    if (!window.confirm(`Excluir o card "${card.title}"? Essa ação não pode ser desfeita.`)) return
    setDeleting(true)
    try {
      await onDelete(card.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setDeleting(false)
    }
  }

  return (
    <div className="card-page">
      <header className="card-page__header">
        <button className="secondary-button card-page__back" onClick={onBack}>
          ← Voltar ao quadro
        </button>
        <div className="card-page__heading">
          <div className="card-page__title-row">
            <h1>{card.title}</h1>
            <CardIdBadge id={card.id} />
          </div>
          <span className="card-page__meta">Criado em {formatDateTime(card.createdAt)}</span>
        </div>
        <StatusBadge
          name={columnName(columns, card.columnId)}
          isDone={columns.find((c) => c.id === card.columnId)?.isDone}
        />
        {card.dueDate && (
          <span
            className={`due-badge due-badge--${getDueStatus(card.dueDate, card.dueTime, columns.find((c) => c.id === card.columnId)?.isDone ?? false)}`}
          >
            Prazo: {card.dueDate.split('-').reverse().join('/')}
            {card.dueTime ? ` ${card.dueTime}` : ''}
          </span>
        )}
        <button
          type="button"
          className="card-page__delete"
          title="Excluir card"
          aria-label="Excluir card"
          disabled={deleting}
          onClick={() => void handleDelete()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16" strokeLinecap="round" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M10 11v6M14 11v6" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {error && <p className="status status--error">{error}</p>}

      <div className="card-page__tabs">
        <button
          type="button"
          className={`card-page__tab${activeTab === 'details' ? ' card-page__tab--active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Detalhes
        </button>
        <button
          type="button"
          className={`card-page__tab${activeTab === 'notebook' ? ' card-page__tab--active' : ''}`}
          onClick={() => setActiveTab('notebook')}
        >
          Caderno
        </button>
      </div>

      {activeTab === 'notebook' ? (
        <CardNotebook cardId={card.id} workspaceId={workspaceId} onNavigateToCard={onNavigateToCard} />
      ) : (
      <div className="card-page__body">
        <div className="card-page__main">
          <section className="card-section">
            <h3>Subtarefas</h3>
            <CardSubtasks cardId={card.id} subtasks={subtasks} onChanged={setSubtasks} />
          </section>

          <section className="card-section">
            <h3>Descrição</h3>
            <textarea
              className="card-section__textarea"
              rows={6}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setDescriptionDirty(true)
              }}
              placeholder="Anotações, resumo do assunto, links…"
            />
            {descriptionDirty && (
              <button className="primary-button" disabled={savingDescription} onClick={handleSaveDescription}>
                {savingDescription ? 'Salvando…' : 'Salvar descrição'}
              </button>
            )}
          </section>

          <section className="card-section">
            <h3>Arquivos</h3>
            <CardAttachments cardId={card.id} attachments={attachments} onChanged={setAttachments} />
          </section>

          <section className="card-section" ref={commentSectionRef}>
            <h3>Comentários</h3>
            <div className="comment-list">
              {comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <p>{comment.body}</p>
                  <span className="comment-item__meta">{formatDateTime(comment.createdAt)}</span>
                </div>
              ))}
              {comments.length === 0 && <p className="empty-hint">Nenhum comentário ainda.</p>}
            </div>
            <form
              className="new-card-form"
              onSubmit={(e) => {
                e.preventDefault()
                void handleAddComment()
              }}
            >
              <textarea
                ref={commentTextareaRef}
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário…"
                disabled={postingComment}
              />
              <button
                type="submit"
                className="primary-button"
                disabled={postingComment || !newComment.trim()}
                style={{ alignSelf: 'flex-start' }}
              >
                Comentar
              </button>
            </form>
          </section>

          <section className="card-section">
            <h3>Histórico</h3>
            <ul className="history-list">
              {history.map((entry) => (
                <li key={entry.id}>
                  <span className="history-list__transition">
                    {columnName(columns, entry.fromStatus)}
                    {' → '}
                    {columnName(columns, entry.toStatus)}
                  </span>
                  <span className="history-list__date">{formatDateTime(entry.changedAt)}</span>
                </li>
              ))}
              {history.length === 0 && <p className="empty-hint">Sem histórico ainda.</p>}
            </ul>
          </section>
        </div>

        <aside className="card-page__aside">
          <section className="card-section">
            <h3>Status</h3>
            <select value={card.columnId} onChange={(e) => handleChangeColumn(e.target.value)}>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </section>

          <section className="card-section">
            <h3>Prazo</h3>
            <div className="due-form">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  setDueDirty(true)
                }}
              />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => {
                  setDueTime(e.target.value)
                  setDueDirty(true)
                }}
                disabled={!dueDate}
              />
              {dueDirty && (
                <button className="primary-button" disabled={savingDue} onClick={handleSaveDueDate}>
                  {savingDue ? 'Salvando…' : 'Salvar prazo'}
                </button>
              )}
              {!dueDirty && card.dueDate && (
                <button className="link-button" disabled={savingDue} onClick={handleClearDueDate}>
                  remover prazo
                </button>
              )}
            </div>
          </section>

          <section className="card-section" ref={timerSectionRef}>
            <h3>Cronômetro</h3>
            <CardTimer card={card} onCardUpdated={setCard} onSessionsChanged={reloadSessions} />
          </section>

          <section className="card-section">
            <h3>Pomodoro</h3>
            <CardPomodoro card={card} onCardUpdated={setCard} onSessionsChanged={reloadSessions} />
          </section>

          <section className="card-section">
            <h3>Sessões de estudo</h3>
            <CardSessions sessions={sessions} />
          </section>

          <section className="card-section">
            <h3>Tags</h3>
            <div className="tag-list">
              {tags.map((tag) => (
                <span key={tag.id} className="tag-chip">
                  {tag.name}
                  <button onClick={() => handleRemoveTag(tag.id)} title="Remover tag">
                    ×
                  </button>
                </span>
              ))}
              {tags.length === 0 && <span className="empty-hint">Nenhuma tag ainda.</span>}
            </div>
            {!showTagForm && (
              <button className="secondary-button" onClick={() => setShowTagForm(true)}>
                + Adicionar tag
              </button>
            )}
            {showTagForm && (
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleAddTag()
                }}
              >
                <input
                  autoFocus
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nova tag (ex.: prova, revisão)"
                />
                <button type="submit" disabled={!newTagName.trim()}>
                  Adicionar
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setShowTagForm(false)
                    setNewTagName('')
                  }}
                >
                  Cancelar
                </button>
              </form>
            )}
          </section>

          <section className="card-section" ref={relationsSectionRef}>
            <h3>Cards relacionados</h3>
            <CardRelations
              workspaceId={workspaceId}
              cardId={card.id}
              columns={columns}
              relations={relations}
              onAdd={handleAddRelation}
              onRemove={handleRemoveRelation}
              onOpenCard={onNavigateToCard}
            />
          </section>
        </aside>
      </div>
      )}
    </div>
  )
}
