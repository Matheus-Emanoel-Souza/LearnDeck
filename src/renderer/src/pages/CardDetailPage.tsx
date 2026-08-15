import { useCallback, useEffect, useState } from 'react'
import type {
  Card,
  CardRelationType,
  CardRelationView,
  CardStatus,
  Comment,
  StatusHistoryEntry,
  StudySession,
  Tag
} from '@shared/types'
import { CARD_STATUSES, CARD_STATUS_LABELS } from '@shared/types'
import { formatDateTime } from '../lib/formatDate'
import StatusBadge from '../components/StatusBadge'
import CardTimer from '../components/CardTimer'
import CardPomodoro from '../components/CardPomodoro'
import CardSessions from '../components/CardSessions'
import CardRelations from '../components/CardRelations'

interface CardDetailPageProps {
  card: Card
  workspaceId: string
  onBack: () => void
  onNavigateToCard: (cardId: string) => void
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
  onBack,
  onNavigateToCard
}: CardDetailPageProps): JSX.Element {
  const [card, setCard] = useState(initialCard)
  const [description, setDescription] = useState(initialCard.description ?? '')
  const [descriptionDirty, setDescriptionDirty] = useState(false)
  const [savingDescription, setSavingDescription] = useState(false)

  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')

  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const [history, setHistory] = useState<StatusHistoryEntry[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [relations, setRelations] = useState<CardRelationView[]>([])
  const [error, setError] = useState<string | null>(null)

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
    setCard(initialCard)
    setDescription(initialCard.description ?? '')
    setDescriptionDirty(false)

    Promise.all([
      window.api.tags.listForCard(initialCard.id),
      window.api.comments.listByCard(initialCard.id),
      window.api.history.listByCard(initialCard.id),
      window.api.timer.listByCard(initialCard.id),
      window.api.relations.listByCard(initialCard.id)
    ])
      .then(([tagList, commentList, historyList, sessionList, relationList]) => {
        setTags(tagList)
        setComments(commentList)
        setHistory(historyList)
        setSessions(sessionList)
        setRelations(relationList)
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

  async function handleChangeStatus(status: CardStatus): Promise<void> {
    try {
      setCard(await window.api.cards.update(card.id, { status }))
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

  return (
    <div className="card-page">
      <header className="card-page__header">
        <button className="secondary-button card-page__back" onClick={onBack}>
          ← Voltar ao quadro
        </button>
        <div className="card-page__heading">
          <h1>{card.title}</h1>
          <span className="card-page__meta">Criado em {formatDateTime(card.createdAt)}</span>
        </div>
        <StatusBadge status={card.status} />
      </header>

      {error && <p className="status status--error">{error}</p>}

      <div className="card-page__body">
        <div className="card-page__main">
          <section className="card-section">
            <h3>Status</h3>
            <select value={card.status} onChange={(e) => handleChangeStatus(e.target.value as CardStatus)}>
              {CARD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CARD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
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
                    {entry.fromStatus ? CARD_STATUS_LABELS[entry.fromStatus] : 'Criado'}
                    {' → '}
                    {CARD_STATUS_LABELS[entry.toStatus]}
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
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault()
                void handleAddTag()
              }}
            >
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nova tag (ex.: prova, revisão)"
              />
              <button type="submit" disabled={!newTagName.trim()}>
                Adicionar
              </button>
            </form>
          </section>

          <section className="card-section">
            <h3>Cards relacionados</h3>
            <CardRelations
              workspaceId={workspaceId}
              cardId={card.id}
              relations={relations}
              onAdd={handleAddRelation}
              onRemove={handleRemoveRelation}
              onOpenCard={onNavigateToCard}
            />
          </section>
        </aside>
      </div>
    </div>
  )
}
