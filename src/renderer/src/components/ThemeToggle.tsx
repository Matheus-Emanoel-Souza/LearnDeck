import { useState } from 'react'
import { applyTheme, getInitialTheme, saveTheme, type Theme } from '../lib/theme'

/** Alterna entre tema claro e escuro; guarda a escolha no localStorage. */
export default function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  function toggle(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    saveTheme(next)
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
