export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'learndeck-theme'

/** Preferência salva pelo usuário, ou o tema do SO se ele nunca escolheu. */
export function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
}
