import { useRef } from 'react'

const LONG_PRESS_MS = 500
// Acima disso o dedo já não está "parado" — é um scroll/arraste (ex.: deslizar
// entre colunas no carrossel estreito), então cancela o long-press.
const MOVE_TOLERANCE_PX = 10

interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

/**
 * Detecta "tocar e segurar" em telas de toque, pra abrir o mesmo menu de
 * contexto do botão direito do mouse — o evento `contextmenu` nativo do
 * navegador não dispara de forma confiável em toque (varia por navegador/PWA
 * e, aqui, o cabeçalho da coluna já é `draggable`, o que atrapalha ainda
 * mais). Não chama `preventDefault` no toque em si, pra não quebrar o scroll
 * horizontal do carrossel — quem cancela um long-press indevido é o
 * `MOVE_TOLERANCE_PX`.
 */
export function useLongPress(onLongPress: (x: number, y: number) => void): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  // Se o long-press já disparou, o dedo solta em cima do menu recém-aberto —
  // sem isso o navegador gera um clique "fantasma" nesse ponto e ativa o que
  // estiver por baixo (ex.: o próprio item "Renomear").
  const firedRef = useRef(false)

  function clear(): void {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startRef.current = null
  }

  function onTouchStart(e: React.TouchEvent): void {
    const touch = e.touches[0]
    if (!touch) return
    firedRef.current = false
    startRef.current = { x: touch.clientX, y: touch.clientY }
    timerRef.current = setTimeout(() => {
      const start = startRef.current
      if (!start) return
      firedRef.current = true
      navigator.vibrate?.(10)
      onLongPress(start.x, start.y)
      clear()
    }, LONG_PRESS_MS)
  }

  function onTouchMove(e: React.TouchEvent): void {
    const touch = e.touches[0]
    const start = startRef.current
    if (!touch || !start) return
    const dx = Math.abs(touch.clientX - start.x)
    const dy = Math.abs(touch.clientY - start.y)
    if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) clear()
  }

  function onTouchEnd(e: React.TouchEvent): void {
    if (firedRef.current) e.preventDefault()
    clear()
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
