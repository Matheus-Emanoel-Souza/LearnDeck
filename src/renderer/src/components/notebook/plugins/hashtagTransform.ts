/**
 * Palavras-chave (#frontend, #banco, #urgente...) precisam de um nó próprio
 * pra ganhar aparência diferenciada no modo visual — o MDXEditor não expõe
 * API pública pra registrar nós Lexical customizados (ver docs/decisions.md),
 * mas expõe diretivas Markdown (`:nome[...]`). Solução: guardamos `#palavra`
 * como texto literal no banco (Markdown continua portátil, grep-ável fora do
 * app), e só na borda — antes de entregar pro MDXEditor / ao receber de volta
 * o Markdown editado — convertemos pra `:tag[palavra]`, que tem editor visual
 * próprio (ver tagDirective.tsx). Nunca mexe em conteúdo dentro de blocos de
 * código (fences ``` ou spans `código`), pra não estragar SQL/JS reais.
 */

const HASHTAG_RE = /(^|[\s([])#([a-zA-Z0-9_À-ÿ-]+)/g
const TAG_DIRECTIVE_RE = /:tag\[([a-zA-Z0-9_À-ÿ-]+)\]/g

/** Aplica `transform` só nos trechos de `markdown` que não são bloco de
 * código nem código inline — code fences e crases ficam sempre intactos. */
function mapOutsideCode(markdown: string, transform: (chunk: string) => string): string {
  const parts = markdown.split(/(```[\s\S]*?```|`[^`\n]*`)/g)
  return parts.map((part, i) => (i % 2 === 0 ? transform(part) : part)).join('')
}

/** Markdown salvo (com `#palavra` literal) → Markdown pro MDXEditor exibir
 * (com `:tag[palavra]`, que renderiza como chip colorido). */
export function expandHashtagsForEditor(markdown: string): string {
  return mapOutsideCode(markdown, (chunk) => chunk.replace(HASHTAG_RE, (_m, pre, word) => `${pre}:tag[${word}]`))
}

/** Markdown exportado pelo MDXEditor (com `:tag[palavra]`) → Markdown pra
 * persistir (com `#palavra` literal, formato portátil). */
export function collapseHashtagsForStorage(markdown: string): string {
  return mapOutsideCode(markdown, (chunk) => chunk.replace(TAG_DIRECTIVE_RE, (_m, word) => `#${word}`))
}
