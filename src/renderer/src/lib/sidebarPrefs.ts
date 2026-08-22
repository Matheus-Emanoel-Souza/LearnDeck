/**
 * Preferência de "minimizar barra lateral" (GroupSidebar). Persistida em
 * localStorage pra sobreviver a reload/reabertura do app. Também serve pra
 * decidir o estado inicial no mobile (breakpoint em global.css): sem
 * preferência salva, começa fechada em telas estreitas e aberta no desktop.
 */

const STORAGE_KEY = 'learndeck:sidebarCollapsed'

/** Mesmo valor do breakpoint `@media (max-width: 720px)` em global.css. */
export const MOBILE_BREAKPOINT_PX = 720

export function loadSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === '1'

  return window.innerWidth <= MOBILE_BREAKPOINT_PX
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
}
