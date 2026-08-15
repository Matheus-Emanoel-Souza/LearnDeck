import { useEffect, useState } from 'react'
import type { Card, CardStatus, Comment, StatusHistoryEntry, Tag } from '@shared/types'
import { CARD_STATUSES, CARD_STATUS_LABELS } from '@shared/types'
import { formatDateTime } from '../lib/formatDate'
import StatusBadge from './StatusBadge'

interface CardDetailModalProps {
  card: Card
  onClose: () => void
  onCardUpdated: (card: Card) => void
}

/**
 * Visualização detalhada do card (Fase 3): descrição editável, tags,
 * comentários e histórico de mudanças de status. Cronômetro e Pomodoro
 * entram nas próximas fases (ver docs/roadmap.md).
 */
export default function CardDetailModal({ card, onClose, onCardUpdated }: CardDetailModalProps): JSX.Element {
  const [description, setDescription] = useState(card.description ?? '')
  const [descriptionDirty, setDescriptionDirty] = useState(false)
  const [savingDescription, setSavingDescription] = useState(false)

  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')

  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const [history, setHistory] = useState<StatusHistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDescription(card.description ?? '')
    setDescriptionDirty(false)

    Promise.all([
      window.api.tags.listForCard(card.id),
      window.api.comments.listByCard(card.id),
      window.api.history.listByCard(card.id)
    ])
      .then(([tagList, commentList, historyList]) => {
        setTags(tagList)
        setComments(commentList)
        setHistory(historyList)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
    // Só reseta ao trocar de card (card.id) — de propósito não inclui
    // card.description, senão qualquer atualização otimista do card no
    // Kanban (ex.: troca de status) apagaria uma edição de descrição em
    // andamento no textarea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  async function handleSaveDescription(): Promise<void> {
    setSavingDescription(true)
    try {
      const updated = await window.api.cards.update(card.id, { description: description.trim() || null })
      onCardUpdated(updated)
      setDescriptionDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingDescription(false)
    }
  }

  async function handleChangeStatus(status: CardStatus): Promise<void> {
    try {
      const updated = await window.api.cards.update(card.id, { status })
      onCardUpdated(updated)
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-panel__header">
          <div>
            <h2>{card.title}</h2>
            <span className="modal-panel__meta">Criado em {formatDateTime(card.createdAt)}</span>
          </div>
          <button className="link-button" onClick={onClose}>
            Fechar ✕
          </button>
        </header>

        {error && <p className="status status--error">{error}</p>}

        <div className="modal-panel__body">
          <section className="modal-section">
            <div className="modal-section__row">
              <label className="modal-section__label">Status</label>
              <select value={card.status} onChange={(e) => handleChangeStatus(e.target.value as CardStatus)}>
                {CARD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {CARD_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <StatusBadge status={card.status} />
            </div>
          </section>

          <section className="modal-section">
            <h3>Descrição</h3>
            <textarea
              className="modal-section__textarea"
              rows={5}
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

          <section className="modal-section">
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

          <section className="modal-section">
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

          <section className="modal-section">
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
      </div>
    </div>
  )
}
