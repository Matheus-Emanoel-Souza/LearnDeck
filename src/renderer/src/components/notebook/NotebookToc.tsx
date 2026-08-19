import { useMemo } from 'react'

interface TocEntry {
  level: number
  text: string
}

function extractHeadings(markdown: string): TocEntry[] {
  const lines = markdown.split(/\r?\n/)
  const entries: TocEntry[] = []
  let inFence = false
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = /^(#{1,3})\s+(.*)/.exec(line)
    if (match) entries.push({ level: match[1].length, text: match[2].trim() })
  }
  return entries
}

interface NotebookTocProps {
  markdown: string
  contentRef: React.RefObject<HTMLDivElement>
}

/** Índice gerado a partir dos títulos do caderno (só H1–H3). Clique rola até
 * o título correspondente dentro do editor — não depende de âncoras/ids
 * (o MDXEditor não expõe isso), localiza pelo texto mesmo. */
export default function NotebookToc({ markdown, contentRef }: NotebookTocProps): JSX.Element | null {
  const headings = useMemo(() => extractHeadings(markdown), [markdown])
  if (headings.length === 0) return null

  function handleClick(text: string): void {
    const root = contentRef.current
    if (!root) return
    const nodes = root.querySelectorAll('h1, h2, h3')
    for (const node of Array.from(nodes)) {
      if (node.textContent?.trim() === text) {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }

  return (
    <nav className="notebook-toc">
      <h4>Índice</h4>
      <ul>
        {headings.map((h, i) => (
          <li key={i} className={`notebook-toc__item notebook-toc__item--h${h.level}`}>
            <button type="button" className="link-button" onClick={() => handleClick(h.text)}>
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
