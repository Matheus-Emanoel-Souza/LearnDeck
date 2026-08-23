import { useEffect, useState } from 'react'
import type { BoardColumn } from '@shared/types'

interface NewCardFormProps {
  columns: BoardColumn[]
  onCreate: (
    title: string,
    description: string | null,
    dueDate: string | null,
    dueTime: string | null,
    columnId: string
  ) => Promise<void>
}

/**
 * Ação global "+ Novo ticket" do quadro: abre o formulário com a coluna de
 * destino selecionável (auto-selecionada quando só existe uma). Continua
 * sendo o único ponto de criação de card — reaproveitado no header do board.
 */
export default function NewCardForm({ columns, onCreate }: NewCardFormProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [columnId, setColumnId] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!columnId && columns.length > 0) setColumnId(columns[0].id)
  }, [columns, columnId])

  if (!open) {
    return (
      <button className="primary-button new-card-form__trigger" onClick={() => setOpen(true)} disabled={columns.length === 0}>
        + Novo ticket
      </button>
    )
  }

  return (
    <form
      className="new-card-form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim() || !columnId || busy) return
        setBusy(true)
        try {
          await onCreate(
            title,
            description.trim() ? description : null,
            dueDate || null,
            dueDate && dueTime ? dueTime : null,
            columnId
          )
          setTitle('')
          setDescription('')
          setDueDate('')
          setDueTime('')
          setOpen(false)
        } finally {
          setBusy(false)
        }
      }}
    >
      <input
        autoFocus
        placeholder="Título do ticket (ex.: Transformada de Laplace)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={busy}
      />
      <textarea
        placeholder="Descrição (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={busy}
        rows={3}
      />
      {columns.length > 1 && (
        <select value={columnId} onChange={(e) => setColumnId(e.target.value)} disabled={busy} title="Coluna de destino">
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <div className="new-card-form__due">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={busy}
          title="Prazo (opcional)"
        />
        <input
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          disabled={busy || !dueDate}
          title="Horário do prazo (opcional)"
        />
      </div>
      <div className="new-card-form__actions">
        <button type="submit" className="primary-button" disabled={busy || !title.trim() || !columnId}>
          Criar ticket
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => setOpen(false)}
          disabled={busy}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
