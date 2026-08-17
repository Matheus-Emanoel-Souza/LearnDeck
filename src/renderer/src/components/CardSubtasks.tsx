import { useState } from 'react'
import type { Subtask } from '@shared/types'
import { formatDueDate, getDueStatus } from '../lib/dueStatus'

interface CardSubtasksProps {
  cardId: string
  subtasks: Subtask[]
  onChanged: (subtasks: Subtask[]) => void
}

/** Subtarefas do card: título, concluída/não, prazo próprio opcional (data +
 * horário), editar e excluir. Prazos aparecem também no Calendário. */
export default function CardSubtasks({ cardId, subtasks, onChanged }: CardSubtasksProps): JSX.Element {
  const [error, setError] = useState<string | null>(null)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editDueTime, setEditDueTime] = useState('')

  async function handleAdd(): Promise<void> {
    if (!newTitle.trim()) return
    try {
      const created = await window.api.subtasks.create({
        cardId,
        title: newTitle,
        dueDate: newDueDate || null,
        dueTime: newDueDate && newDueTime ? newDueTime : null
      })
      onChanged([...subtasks, created])
      setNewTitle('')
      setNewDueDate('')
      setNewDueTime('')
      setShowNewForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleToggleDone(subtask: Subtask): Promise<void> {
    try {
      const updated = await window.api.subtasks.update(subtask.id, { isDone: !subtask.isDone })
      onChanged(subtasks.map((s) => (s.id === updated.id ? updated : s)))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function startEdit(subtask: Subtask): void {
    setEditingId(subtask.id)
    setEditTitle(subtask.title)
    setEditDueDate(subtask.dueDate ?? '')
    setEditDueTime(subtask.dueTime ?? '')
  }

  async function commitEdit(): Promise<void> {
    if (!editingId || !editTitle.trim()) return
    try {
      const updated = await window.api.subtasks.update(editingId, {
        title: editTitle,
        dueDate: editDueDate || null,
        dueTime: editDueDate && editDueTime ? editDueTime : null
      })
      onChanged(subtasks.map((s) => (s.id === updated.id ? updated : s)))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await window.api.subtasks.delete(id)
      onChanged(subtasks.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div>
      {error && <p className="status status--error">{error}</p>}

      <ul className="subtask-list">
        {subtasks.map((subtask) => {
          const status = getDueStatus(subtask.dueDate, subtask.dueTime, subtask.isDone)
          const editing = editingId === subtask.id

          if (editing) {
            return (
              <li key={subtask.id} className="subtask-item subtask-item--editing">
                <form
                  className="subtask-item__edit-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void commitEdit()
                  }}
                >
                  <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                  <input
                    type="time"
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    disabled={!editDueDate}
                  />
                  <button type="submit" className="primary-button" disabled={!editTitle.trim()}>
                    Salvar
                  </button>
                  <button type="button" className="link-button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                </form>
              </li>
            )
          }

          return (
            <li key={subtask.id} className={`subtask-item ${subtask.isDone ? 'subtask-item--done' : ''}`}>
              <input type="checkbox" checked={subtask.isDone} onChange={() => void handleToggleDone(subtask)} />
              <span className="subtask-item__title" onClick={() => startEdit(subtask)}>
                {subtask.title}
              </span>
              {subtask.dueDate && (
                <span className={`due-badge due-badge--${status}`}>
                  {formatDueDate(subtask.dueDate, subtask.dueTime)}
                </span>
              )}
              <button className="link-button" onClick={() => void handleDelete(subtask.id)}>
                excluir
              </button>
            </li>
          )
        })}
        {subtasks.length === 0 && <p className="empty-hint">Nenhuma subtarefa ainda.</p>}
      </ul>

      {!showNewForm && (
        <button className="secondary-button" onClick={() => setShowNewForm(true)}>
          + Adicionar subtarefa
        </button>
      )}

      {showNewForm && (
        <form
          className="subtask-new-form"
          onSubmit={(e) => {
            e.preventDefault()
            void handleAdd()
          }}
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nova subtarefa…"
          />
          <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
          <input
            type="time"
            value={newDueTime}
            onChange={(e) => setNewDueTime(e.target.value)}
            disabled={!newDueDate}
          />
          <button type="submit" disabled={!newTitle.trim()}>
            Adicionar
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setShowNewForm(false)
              setNewTitle('')
              setNewDueDate('')
              setNewDueTime('')
            }}
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  )
}
