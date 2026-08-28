/**
 * Baixa um objeto como arquivo `.json` pelo navegador — funciona igual no
 * Electron (o `BrowserWindow` é Chromium) e no build web, sem diálogo nativo:
 * cria um Blob, um `<a download>` temporário e simula o clique.
 */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
