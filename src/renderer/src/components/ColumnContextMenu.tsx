import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { COLUMN_COLOR_SWATCHES } from '../lib/columnColors'

const VIEWPORT_MARGIN_PX = 8

interface ColumnContextMenuProps {
  x: number
  y: number
  currentName: string
  onRename: (name: string) => void
  onCreateColumn: (name: string) => void
  onDuplicate: () => void
  onSetColor: (color: string | null) => void
  onDelete: () => void
  onClose: () => void
}

type Panel = 'rename' | 'new' | 'color' | null

/**
 * Menu de contexto (botão direito) de uma coluna do Kanban: lista compacta
 * de opções — Renomear/Nova coluna/Definir cor só abrem o campo/paleta
 * correspondente quando clicados (um de cada vez), Duplicar e Excluir agem
 * na hora. Fecha ao clicar fora ou Esc.
 */
export default function ColumnContextMenu({
  x,
  y,
  currentName,
  onRename,
  onCreateColumn,
  onDuplicate,
  onSetColor,
  onDelete,
  onClose
}: ColumnContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [name, setName] = useState(currentName)
  const [newColumnName, setNewColumnName] = useState('')
  // No toque (tocar e segurar), o ponto de abertura costuma cair perto da
  // borda da tela — sem isso o menu nasce cortado. Mede o próprio tamanho
  // depois de montado e reencaixa dentro da viewport.
  const [position, setPosition] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const maxLeft = Math.max(VIEWPORT_MARGIN_PX, window.innerWidth - rect.width - VIEWPORT_MARGIN_PX)
    const maxTop = Math.max(VIEWPORT_MARGIN_PX, window.innerHeight - rect.height - VIEWPORT_MARGIN_PX)
    setPosition({
      left: Math.min(x, maxLeft),
      top: Math.min(y, maxTop)
    })
  }, [x, y])

  function togglePanel(p: Panel): void {
    setPanel((current) => (current === p ? null : p))
  }

  function commitRename(): void {
    const trimmed = name.trim()
    if (trimmed && trimmed !== currentName) onRename(trimmed)
    onClose()
  }

  function commitCreate(): void {
    const trimmed = newColumnName.trim()
    if (!trimmed) return
    onCreateColumn(trimmed)
    onClose()
  }

  useEffect(() => {
    function handlePointerDown(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div ref={ref} className="context-menu" style={{ left: position.left, top: position.top }}>
      <div className="context-menu__title">{currentName}</div>

      <button
        className={`context-menu__item ${panel === 'rename' ? 'context-menu__item--active' : ''}`}
        onClick={() => togglePanel('rename')}
      >
        Renomear
      </button>
      {panel === 'rename' && (
        <form
          className="context-menu__panel-form"
          onSubmit={(e) => {
            e.preventDefault()
            commitRename()
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
            }}
          />
          <button type="submit" disabled={!name.trim()}>
            OK
          </button>
        </form>
      )}

      <button
        className={`context-menu__item ${panel === 'new' ? 'context-menu__item--active' : ''}`}
        onClick={() => togglePanel('new')}
      >
        Nova coluna
      </button>
      {panel === 'new' && (
        <form
          className="context-menu__panel-form"
          onSubmit={(e) => {
            e.preventDefault()
            commitCreate()
          }}
        >
          <input
            autoFocus
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="Nome da coluna…"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
            }}
          />
          <button type="submit" disabled={!newColumnName.trim()}>
            Criar
          </button>
        </form>
      )}

      <button
        className={`context-menu__item ${panel === 'color' ? 'context-menu__item--active' : ''}`}
        onClick={() => togglePanel('color')}
      >
        Definir cor
      </button>
      {panel === 'color' && (
        <div className="context-menu__panel-form context-menu__swatches">
          <button
            className="context-menu__swatch context-menu__swatch--none"
            title="Sem cor"
            onClick={() => {
              onSetColor(null)
              onClose()
            }}
          >
            ×
          </button>
          {COLUMN_COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              className="context-menu__swatch"
              style={{ background: color }}
              title={color}
              onClick={() => {
                onSetColor(color)
                onClose()
              }}
            />
          ))}
        </div>
      )}

      <div className="context-menu__divider" />

      <button className="context-menu__item" onClick={onDuplicate}>
        Duplicar
      </button>

      <button className="context-menu__item context-menu__item--danger" onClick={onDelete}>
        Excluir
      </button>
    </div>
  )
}
