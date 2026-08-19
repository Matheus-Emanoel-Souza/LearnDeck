import type { NotebookVersion } from '@shared/types'
import { formatDateTime } from '../../lib/formatDate'

interface VersionHistoryPanelProps {
  versions: NotebookVersion[]
  onRestore: (version: number) => void
  onClose: () => void
}

/** Painel de histórico de versões do caderno — uma entrada por save (ver
 * notebookRepository.updateNotebookIfVersionMatches), com opção de
 * restaurar uma versão antiga (isso cria uma versão nova com o conteúdo
 * dela, o histórico nunca é apagado). */
export default function VersionHistoryPanel({ versions, onRestore, onClose }: VersionHistoryPanelProps): JSX.Element {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <h2>Histórico de versões</h2>
          <button className="secondary-button" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="modal-panel__body">
          <ul className="notebook-version-list">
            {versions.map((v) => (
              <li key={v.id} className="notebook-version-list__item">
                <div>
                  <strong>Versão {v.version}</strong>
                  <span className="notebook-version-list__date">{formatDateTime(v.createdAt)}</span>
                </div>
                {v.version !== versions[0].version && (
                  <button className="link-button" onClick={() => onRestore(v.version)}>
                    restaurar
                  </button>
                )}
              </li>
            ))}
            {versions.length === 0 && <p className="empty-hint">Nenhuma versão salva ainda.</p>}
          </ul>
        </div>
      </div>
    </div>
  )
}
