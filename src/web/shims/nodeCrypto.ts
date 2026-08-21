/**
 * Shim de `node:crypto` para o build web. Repositórios (main/repositories/*)
 * importam `randomUUID` de `node:crypto` porque rodam tanto no processo main
 * do Electron quanto — sem nenhuma mudança de código — aqui no browser.
 * `vite.web.config.ts` faz `node:crypto` apontar pra este arquivo.
 */
export function randomUUID(): string {
  return crypto.randomUUID()
}
