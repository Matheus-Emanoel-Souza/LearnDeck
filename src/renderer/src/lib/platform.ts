/** `true` só no build web (setado por `src/web/main.tsx` antes de montar
 * `<App/>`). No build Electron fica `false` — nada muda pro desktop. */
export function isWebBuild(): boolean {
  return Boolean((window as unknown as { __LEARNDECK_WEB__?: boolean }).__LEARNDECK_WEB__)
}
