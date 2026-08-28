import { useEffect, useRef, useState } from 'react'
import type { UpdateStatus } from '@shared/types'
import { downloadJson } from '../lib/downloadJson'

interface SettingsProps {
  currentVersion: string
  workspaceId: string
}

type BackupPhase = 'idle' | 'exporting' | 'importing'
type BackupMessage = { kind: 'success' | 'error'; text: string }

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
export default function Settings({ currentVersion, workspaceId }: SettingsProps): JSX.Element {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [backupPhase, setBackupPhase] = useState<BackupPhase>('idle')
  const [backupMessage, setBackupMessage] = useState<BackupMessage | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const backupBusy = backupPhase !== 'idle'

  async function handleBackupExport(): Promise<void> {
    setBackupPhase('exporting')
    setBackupMessage(null)
    try {
      const backup = await window.api.backup.export(workspaceId)
      const today = new Date().toISOString().slice(0, 10)
      downloadJson(`learndeck-backup-${today}.json`, backup)
      setBackupMessage({ kind: 'success', text: 'Backup criado e baixado com sucesso.' })
    } catch (err) {
      setBackupMessage({
        kind: 'error',
        text: `Não foi possível gerar o backup: ${err instanceof Error ? err.message : String(err)}`
      })
    } finally {
      setBackupPhase('idle')
    }
  }

  async function handleBackupFileSelected(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    // Limpa já aqui: sem isso, escolher o MESMO arquivo de novo (ex.: depois
    // de corrigir e tentar de novo) não dispara este evento uma segunda vez.
    e.target.value = ''
    if (!file) return

    setBackupPhase('importing')
    setBackupMessage(null)
    try {
      const text = await file.text()
      let payload: unknown
      try {
        payload = JSON.parse(text)
      } catch {
        throw new Error('O arquivo selecionado não é um JSON válido.')
      }
      // A validação de verdade (formato, versão, integridade referencial)
      // acontece em backupService.validateBackup, do lado do main/web — só
      // depois de passar por ela é que qualquer dado é escrito no banco.
      const summary = await window.api.backup.import(workspaceId, payload)
      setBackupMessage({
        kind: 'success',
        text: `Importação concluída: ${summary.groups} matéria(s) e ${summary.cards} ticket(s) restaurados.`
      })
    } catch (err) {
      setBackupMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBackupPhase('idle')
    }
  }

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

      <section className="card-section">
        <h3>Backup de dados</h3>
        <p className="empty-hint">
          Exporta todas as suas matérias/projetos e tickets (colunas, comentários, subtarefas,
          relações e caderno) num único arquivo <code>.json</code>, pra guardar ou restaurar
          depois. Anexos de arquivo não entram nesta versão do backup.
        </p>

        <div className="settings-backup-actions">
          <button className="secondary-button" onClick={() => void handleBackupExport()} disabled={backupBusy}>
            {backupPhase === 'exporting' ? 'Gerando backup…' : 'Fazer backup'}
          </button>
          <button
            className="secondary-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={backupBusy}
          >
            {backupPhase === 'importing' ? 'Importando…' : 'Importar backup'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="settings-backup-file-input"
            onChange={(e) => void handleBackupFileSelected(e)}
          />
        </div>

        {backupMessage && (
          <p className={`update-status update-status--${backupMessage.kind === 'success' ? 'ok' : 'error'}`}>
            {backupMessage.text}
          </p>
        )}
      </section>
    </div>
  )
}
