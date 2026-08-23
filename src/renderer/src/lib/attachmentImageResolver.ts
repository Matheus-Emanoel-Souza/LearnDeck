/**
 * Só no build web: o caderno guarda imagens como `ldattach://<cardId>/<id>`
 * (mesmo texto que o build Electron resolve com um protocolo customizado —
 * ver src/main/index.ts). Navegador comum não sabe resolver um esquema
 * `ldattach://` em `<img src>`, então este observer troca, ao vivo, cada
 * `<img>` desse tipo por uma object URL do blob salvo no IndexedDB.
 */
import { resolveAttachmentBlobUrl } from './attachmentBlobStore'

const LDATTACH_PREFIX = 'ldattach://'

function parseLdattachSrc(src: string): { attachmentId: string } | undefined {
  if (!src.startsWith(LDATTACH_PREFIX)) return undefined
  const rest = src.slice(LDATTACH_PREFIX.length)
  const slash = rest.indexOf('/')
  if (slash < 0) return undefined
  return { attachmentId: rest.slice(slash + 1) }
}

function resolveImage(img: HTMLImageElement): void {
  const parsed = parseLdattachSrc(img.getAttribute('src') ?? '')
  if (!parsed) return
  resolveAttachmentBlobUrl(parsed.attachmentId)
    .then((url) => {
      if (url) img.src = url
    })
    .catch(() => {
      /* imagem fica quebrada — anexo pode ter sido removido */
    })
}

/** Liga um MutationObserver no container do caderno; devolve a função de
 * desligar. Chamar só quando `isWebBuild()` for true. */
export function watchLdattachImages(container: HTMLElement): () => void {
  container.querySelectorAll('img').forEach((img) => resolveImage(img as HTMLImageElement))

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        if (node.tagName === 'IMG') resolveImage(node as HTMLImageElement)
        node.querySelectorAll?.('img').forEach((img) => resolveImage(img as HTMLImageElement))
      })
    }
  })
  observer.observe(container, { childList: true, subtree: true })
  return () => observer.disconnect()
}
