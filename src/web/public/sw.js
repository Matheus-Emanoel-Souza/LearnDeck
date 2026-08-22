// Service worker do build web. Duas estratégias, conforme o tipo de pedido:
//
// - Navegação (o index.html): REDE PRIMEIRO, cache só como reserva offline.
//   O HTML é o único arquivo com nome fixo e é ele que aponta pros bundles
//   com hash. Servir uma cópia velha dele depois de um deploy faz o app pedir
//   assets que não existem mais no servidor — tela branca. Por isso ele nunca
//   pode vir do cache quando há rede.
//
// - Demais GETs (bundles, wasm, fontes): stale-while-revalidate. Como o Vite
//   põe hash no nome, um arquivo em cache nunca fica "errado" — ou é o mesmo
//   conteúdo, ou o HTML novo já pede outro nome.
//
// Os dados do app (SQLite + anexos) NÃO passam por aqui — vivem no IndexedDB,
// ver src/web/db/.
const CACHE = 'learndeck-web-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          // Offline: melhor o app antigo do que nada.
          const cache = await caches.open(CACHE)
          return (await cache.match(request)) ?? Response.error()
        })
    )
    return
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
