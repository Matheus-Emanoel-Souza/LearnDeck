// Service worker do build web: cache "stale-while-revalidate" simples.
// Não pré-cacheia uma lista fixa de arquivos (o build do Vite gera nomes
// com hash a cada versão) — em vez disso guarda no cache toda resposta GET
// bem-sucedida e serve dela quando não há rede, atualizando em segundo plano
// quando há. Os dados do app (SQLite + anexos) NÃO passam por aqui — vivem
// no IndexedDB, ver src/web/db/.
const CACHE = 'learndeck-web-v1'

self.addEventListener('install', (event) => {
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
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request)
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) cache.put(event.request, response.clone())
          return response
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
