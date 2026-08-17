import { useEffect, useState } from 'react'
import type { BoardColumn, UpdateStatus } from '@shared/types'

interface SettingsProps {
  currentVersion: string
  workspaceId: string
}

/**
 * Configurações > Sobre & atualizações + Colunas do quadro. A parte de
 * atualização só reflete estado — quem checa, baixa e instala é o main
 * (src/main/updater.ts); aqui a gente só assina os eventos e dispara os
 * cliques. A parte de colunas é o CRUD completo (criar/renomear/mover/
 * excluir) usado por todos os quadros do workspace.
 */
export default function Settings({ currentVersion, workspaceId }: SettingsProps): JSX.Element {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })

  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [columnsError, setColumnsError] = useState<string | null>(null)
  const [newColumnName, setNewColumnName] = useState('')
  const [renaming, setRenaming] = useState<Record<string, string>>({})

  function reloadColumns(): void {
    window.api.boardColumns
      .list(workspaceId)
      .then(setColumns)
      .catch((err: unknown) => setColumnsError(err instanceof Error ? err.message : String(err)))
  }

  useEffect(() => {
    reloadColumns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  async function handleCreateColumn(): Promise<void> {
    if (!newColumnName.trim()) return
    try {
      await window.api.boardColumns.create({ workspaceId, name: newColumnName.trim() })
      setNewColumnName('')
      reloadColumns()
    } catch (err) {
      setColumnsError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleRenameColumn(id: string): Promise<void> {
    const name = renaming[id]?.trim()
    if (!name) return
    try {
      await window.api.boardColumns.update(id, { name })
      setRenaming((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      reloadColumns()
    } catch (err) {
      setColumnsError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleMoveColumn(id: string, direction: 'left' | 'right'): Promise<void> {
    try {
      await window.api.boardColumns.move(id, direction)
      reloadColumns()
    } catch (err) {
      setColumnsError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDeleteColumn(id: string): Promise<void> {
    if (!window.confirm('Excluir esta coluna? Só é possível se ela estiver vazia.')) return
    try {
      await window.api.boardColumns.delete(id)
      reloadColumns()
    } catch (err) {
      setColumnsError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    window.api.updater
      .getStatus()
      .then(setStatus)
      .catch(() => undefined)
    return window.api.updater.onStatus(setStatus)
  }, [])

  async function handleCheck(): Promise<void> {
    await window.api.updater.check()
  }

  async function handlePrimaryAction(): Promise<void> {
    if (status.state === 'available') await window.api.updater.download()
    else if (status.state === 'downloaded') await window.api.updater.install()
  }

  const checking = status.state === 'checking'
  const busy = checking || status.state === 'downloading'

  return (
    <div className="dashboard">
      <section className="card-section">
        <h3>Colunas do quadro</h3>
        <p className="empty-hint">
          Renomeie, reordene, crie ou exclua as colunas do Kanban (ex.: &ldquo;A estudar&rdquo;). Uma coluna só
          pode ser excluída se estiver vazia.
        </p>

        {columnsError && <p className="status status--error">{columnsError}</p>}

        <ul className="board-column-list">
          {columns.map((column, index) => (
            <li key={column.id} className="board-column-list__item">
              <input
                className="board-column-list__name-input"
                value={renaming[column.id] ?? column.name}
                onChange={(e) => setRenaming((prev) => ({ ...prev, [column.id]: e.target.value }))}
                onBlur={() => handleRenameColumn(column.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
              />
              <div className="board-column-list__actions">
                <button
                  className="secondary-button"
                  disabled={index === 0}
                  title="Mover para a esquerda"
                  onClick={() => handleMoveColumn(column.id, 'left')}
                >
                  ←
                </button>
                <button
                  className="secondary-button"
                  disabled={index === columns.length - 1}
                  title="Mover para a direita"
                  onClick={() => handleMoveColumn(column.id, 'right')}
                >
                  →
                </button>
                <button
                  className="secondary-button"
                  onClick={() => handleDeleteColumn(column.id)}
                  title="Excluir coluna"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            void handleCreateColumn()
          }}
        >
          <input
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="Nova coluna (ex.: Em revisão)"
          />
          <button type="submit" disabled={!newColumnName.trim()}>
            Adicionar
          </button>
        </form>
      </section>

      <section className="card-section">
        <h3>Sobre &amp; atualizações</h3>

        <div className="settings-version-row">
          <div>
            <span className="settings-version-row__label">Versão instalada</span>
            <span className="settings-version-row__value">v{currentVersion}</span>
          </div>
          <button
            className="secondary-button"
            onClick={() => void handleCheck()}
            disabled={busy || status.state === 'unsupported'}
          >
            {checking ? 'Verificando…' : 'Verificar atualizações'}
          </button>
        </div>

        {status.state === 'unsupported' && (
          <p className="empty-hint">
            Verificação de atualizações só funciona no aplicativo instalado — não roda no modo de
            desenvolvimento.
          </p>
        )}

        {status.state === 'up-to-date' && (
          <p className="update-status update-status--ok">Você está usando a versão mais recente.</p>
        )}

        {status.state === 'error' && (
          <p className="update-status update-status--error">
            Não foi possível verificar atualizações agora. Confira sua conexão com a internet e tente
            de novo. ({status.message})
          </p>
        )}

        {(status.state === 'available' || status.state === 'downloading' || status.state === 'downloaded') && (
          <div className="update-status update-status--info">
            <p>
              Nova versão disponível: <strong>v{status.version}</strong>
              {status.state === 'downloaded' && ' — baixada e pronta para instalar'}
            </p>

            {status.state === 'downloading' && (
              <div className="update-progress">
                <div className="update-progress__fill" style={{ width: `${status.percent}%` }} />
                <span className="update-progress__label">{status.percent}%</span>
              </div>
            )}

            {status.state !== 'downloading' && (
              <button className="primary-button" onClick={() => void handlePrimaryAction()}>
                {status.state === 'downloaded' ? 'Reiniciar e instalar agora' : 'Atualizar agora'}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
