import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/types'

interface SettingsProps {
  currentVersion: string
}

/**
 * Configurações > Sobre & atualizações. Só reflete estado — quem checa,
 * baixa e instala é o main (src/main/updater.ts); aqui a gente só assina os
 * eventos e dispara os cliques.
 *
 * O CRUD de colunas (criar/renomear/mover/duplicar/excluir) não mora mais
 * aqui: cada matéria tem seu próprio conjunto de colunas agora, e isso já é
 * editado direto no quadro dela (botão direito numa coluna, ou no espaço
 * vazio à direita da última pra criar uma nova).
 */
export default function Settings({ currentVersion }: SettingsProps): JSX.Element {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })

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
