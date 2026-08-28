import type { UpdateStatus } from '@shared/types'

/**
 * Equivalente a src/main/updater.ts, mas pro build web: sem instalador, sem
 * `electron-updater` — "atualizar" aqui é só "recarregar buscando o build
 * mais novo". Quem fica sabendo se há um build mais novo é a comparação entre
 * `__WEB_BUILD_ID__` (embutido no bundle atual, ver vite.web.config.ts) e o
 * `version.json` publicado junto — os dois vêm do mesmo id calculado uma
 * única vez no momento do build, então uma comparação direta já basta.
 */

let currentStatus: UpdateStatus = { state: 'idle' }
const listeners = new Set<(status: UpdateStatus) => void>()

function setStatus(status: UpdateStatus): void {
  currentStatus = status
  listeners.forEach((listener) => listener(status))
}

export function getWebUpdaterStatus(): UpdateStatus {
  return currentStatus
}

export function onWebUpdaterStatus(callback: (status: UpdateStatus) => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * "Verificar atualizações": busca `version.json` direto da rede — `cache:
 * 'no-store'` pra não pegar uma cópia velha do cache HTTP nem do service
 * worker (ver public/sw.js, que faz stale-while-revalidate pros GETs em
 * geral) — e compara com o id do build corrente.
 */
export async function checkWebUpdate(): Promise<void> {
  setStatus({ state: 'checking' })
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Não foi possível verificar (HTTP ${res.status}).`)
    const data = (await res.json()) as { buildId?: string }
    if (data.buildId && data.buildId !== __WEB_BUILD_ID__) {
      setStatus({ state: 'available', version: data.buildId })
    } else {
      setStatus({ state: 'up-to-date', version: __WEB_BUILD_ID__ })
    }
  } catch (err) {
    setStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

/** "Atualizar agora": não há nada pra baixar separado do próprio HTML — a
 * recarga já busca o index.html e os bundles novos (rede-primeiro, ver
 * public/sw.js). */
export function applyWebUpdate(): void {
  window.location.reload()
}
