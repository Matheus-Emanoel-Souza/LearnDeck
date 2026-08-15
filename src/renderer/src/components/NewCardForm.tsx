import { useState } from 'react'

interface NewCardFormProps {
  onCreate: (title: string, description: string | null) => Promise<void>
}

export default function NewCardForm({ onCreate }: NewCardFormProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button className="primary-button" onClick={() => setOpen(true)}>
        + Novo card
      </button>
    )
  }

  return (
    <form
      className="new-card-form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim() || busy) return
        setBusy(true)
        try {
          await onCreate(title, description.trim() ? description : null)
          setTitle('')
          setDescription('')
          setOpen(false)
        } finally {
          setBusy(false)
        }
      }}
    >
      <input
        autoFocus
        placeholder="Título do card (ex.: Transformada de Laplace)"
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
      <div className="new-card-form__actions">
        <button type="submit" className="primary-button" disabled={busy || !title.trim()}>
          Criar card
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
