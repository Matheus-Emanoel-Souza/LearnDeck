/**
 * Handler único pro imagePlugin do MDXEditor — cobre colar (Ctrl+V), arrastar
 * e soltar, e selecionar pelo botão da barra de ferramentas, porque o
 * MDXEditor chama o mesmo `imageUploadHandler` nos três casos.
 *
 * A imagem NUNCA vira Base64 no Markdown: é gravada como um anexo do card
 * (mesmo storage dos arquivos anexados — ver attachmentService) e o Markdown
 * guarda só `ldattach://<cardId>/<attachmentId>`, resolvido pelo protocolo
 * customizado registrado em main/index.ts.
 */
export function makeImageUploadHandler(cardId: string) {
  return async function imageUploadHandler(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const attachment = await window.api.attachments.addFromBuffer(
      cardId,
      file.name || 'imagem.png',
      buffer,
      file.type || 'image/png'
    )
    return `ldattach://${cardId}/${attachment.id}`
  }
}
