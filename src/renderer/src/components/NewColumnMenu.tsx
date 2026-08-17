import { useEffect, useRef, useState } from 'react'

interface NewColumnMenuProps {
  x: number
  y: number
  onCreate: (name: string) => void
  onClose: () => void
}

/** Menu de contexto (botão direito no espaço vazio à direita da última coluna): nome + criar. */
export default function NewColumnMenu({ x, y, onCreate, onClose }: NewColumnMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('')

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

  function commit(): void {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
    onClose()
  }

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
      <div className="context-menu__section-label">Nova coluna</div>
      <form
        className="context-menu__rename-form"
        onSubmit={(e) => {
          e.preventDefault()
          commit()
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da coluna…"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
          }}
        />
        <button type="submit" disabled={!name.trim()}>
          Criar
        </button>
      </form>
    </div>
  )
}
