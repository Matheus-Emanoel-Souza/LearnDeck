export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

interface SaveIndicatorProps {
  state: SaveState
  updatedAt: string | null
}

const LABELS: Record<SaveState, string> = {
  idle: '',
  saving: 'Salvando…',
  saved: 'Salvo',
  error: 'Erro ao salvar',
  conflict: 'Conflito: outra edição foi salva por cima'
}

/** Indicador de auto-salvamento do caderno — ver CardNotebook. */
export default function SaveIndicator({ state, updatedAt }: SaveIndicatorProps): JSX.Element {
  return (
    <span className={`notebook-save-indicator notebook-save-indicator--${state}`}>
      {LABELS[state]}
      {state === 'saved' && updatedAt && (
        <span className="notebook-save-indicator__meta"> · {new Date(updatedAt).toLocaleString('pt-BR')}</span>
      )}
    </span>
  )
}
