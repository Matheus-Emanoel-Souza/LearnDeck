import { useEffect, useState } from 'react'
import { MOBILE_BREAKPOINT_PX } from './sidebarPrefs'

const QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`

/**
 * `true` em telas estreitas (celular, ou a janela do desktop encolhida). É o
 * mesmo breakpoint das media queries de `global.css` — a diferença é que aqui
 * dá pra trocar a *estrutura* da tela, não só o estilo: no estreito o app usa
 * navegação por telas (barra de abas embaixo, quadro em drill-down) em vez do
 * layout de painéis lado a lado do desktop.
 */
export function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent): void => setIsNarrow(e.matches)
    // Reavalia na montagem: a largura pode ter mudado entre o estado inicial e o efeito.
    setIsNarrow(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isNarrow
}
