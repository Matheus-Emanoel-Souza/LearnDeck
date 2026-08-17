import { useState } from 'react'
import type { Attachment } from '@shared/types'
import { formatBytes } from '../lib/formatDate'

interface CardAttachmentsProps {
  cardId: string
  attachments: Attachment[]
  onChanged: (attachments: Attachment[]) => void
}

/** Anexos do card: seletor nativo de arquivos (multi-seleção), lista com
 * abrir/remover. O arquivo é copiado pro storage do app — ver attachmentService. */
export default function CardAttachments({ cardId, attachments, onChanged }: CardAttachmentsProps): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      onChanged(await window.api.attachments.pickAndAdd(cardId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleOpen(id: string): Promise<void> {
    try {
      await window.api.attachments.open(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleRemove(id: string): Promise<void> {
    try {
      await window.api.attachments.remove(id)
      onChanged(attachments.filter((a) => a.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div>
      {error && <p className="status status--error">{error}</p>}

      <ul className="attachment-list">
        {attachments.map((a) => (
          <li key={a.id} className="attachment-item">
            <button className="attachment-item__name" onClick={() => void handleOpen(a.id)} title="Abrir arquivo">
              {a.fileName}
            </button>
            <span className="attachment-item__size">{formatBytes(a.sizeBytes)}</span>
            <button className="link-button" onClick={() => void handleRemove(a.id)} title="Remover anexo">
              remover
            </button>
          </li>
        ))}
        {attachments.length === 0 && <p className="empty-hint">Nenhum arquivo anexado ainda.</p>}
      </ul>

      <button className="secondary-button" disabled={busy} onClick={() => void handleAdd()}>
        {busy ? 'Abrindo seletor…' : '+ Anexar arquivo'}
      </button>
    </div>
  )
}
