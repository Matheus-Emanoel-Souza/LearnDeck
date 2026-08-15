import { useState } from 'react'
import type { MouseEvent } from 'react'

interface CardIdBadgeProps {
  id: string
}

/**
 * ID curto e visível do card (com o ID completo no tooltip), para facilitar
 * localizá-lo depois — por exemplo colando no campo de busca. O botão copia
 * o ID completo para a área de transferência.
 */
export default function CardIdBadge({ id }: CardIdBadgeProps): JSX.Element {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: MouseEvent<HTMLButtonElement>): Promise<void> {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Área de transferência indisponível — sem tela de erro por causa disso.
    }
  }

  return (
    <span className="card-id-badge" title={id}>
      <span className="card-id-badge__value">#{id.slice(0, 8)}</span>
      <button
        type="button"
        className="card-id-badge__copy"
        onClick={handleCopy}
        title="Copiar ID completo"
      >
        {copied ? '✓' : '⧉'}
      </button>
    </span>
  )
}
