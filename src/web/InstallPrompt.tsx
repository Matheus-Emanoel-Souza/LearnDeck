import { useEffect, useState } from 'react'
import './installPrompt.css'

/**
 * Cartão que oferece instalar o LearnDeck como app (PWA).
 *
 * Existe só no build web — é montado em `main.tsx`, fora de `App`, para não
 * tocar em nada compartilhado com o Electron (ver docs/WEBAPP.md).
 *
 * São dois caminhos, porque o iOS não tem API de instalação:
 * - Chromium (Android/desktop): o navegador dispara `beforeinstallprompt`;
 *   guardamos o evento e disparamos o diálogo nativo no nosso botão.
 * - Safari no iPhone: nenhum site consegue se instalar; só dá para ensinar
 *   o caminho "Compartilhar > Adicionar à Tela de Início".
 *
 * Ver docs/PWA-INSTALAR.md.
 */

/** Evento do Chromium que ainda não está nos tipos padrão do DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'learndeck.installDismissed'

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Já está rodando instalado? iOS usa `navigator.standalone`; o resto, display-mode. */
function isStandalone(): boolean {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  const displayMode = window.matchMedia?.('(display-mode: standalone)').matches === true
  return iosStandalone || displayMode
}

type Mode = 'hidden' | 'chromium' | 'ios'

export default function InstallPrompt(): JSX.Element | null {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [mode, setMode] = useState<Mode>('hidden')

  useEffect(() => {
    // Não incomoda quem já instalou nem quem já dispensou o convite.
    if (isStandalone()) return
    if (localStorage.getItem(DISMISSED_KEY) === '1') return

    function onBeforeInstallPrompt(event: Event): void {
      // Cancela a barrinha padrão do navegador para mostrarmos a nossa.
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setMode('chromium')
    }

    function onAppInstalled(): void {
      setDeferred(null)
      setMode('hidden')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    // No iPhone o evento acima nunca dispara: mostramos a instrução direto.
    if (isIOS()) setMode('ios')

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  if (mode === 'hidden') return null

  async function install(): Promise<void> {
    if (!deferred) return
    // prompt() só vale dentro de um clique real, e o evento serve uma vez só.
    await deferred.prompt()
    try {
      await deferred.userChoice
    } catch {
      /* usuário fechou o diálogo: nada a fazer */
    }
    setDeferred(null)
    setMode('hidden')
  }

  function dismiss(): void {
    localStorage.setItem(DISMISSED_KEY, '1')
    setMode('hidden')
  }

  return (
    <div className="install-card" role="dialog" aria-label="Instalar o LearnDeck como app">
      <span className="install-card__text">
        {mode === 'ios' ? (
          <>
            Instalar como app: toque em <b>Compartilhar</b> e em <b>&ldquo;Adicionar à Tela de Início&rdquo;</b>.
          </>
        ) : (
          'Instalar o LearnDeck como app?'
        )}
      </span>

      {mode === 'chromium' && (
        <button className="install-card__go" onClick={install}>
          Instalar
        </button>
      )}

      <button className="install-card__close" onClick={dismiss} aria-label="Dispensar" title="Dispensar">
        ✕
      </button>
    </div>
  )
}
