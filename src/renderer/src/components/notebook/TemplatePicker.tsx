interface TemplatePickerProps {
  onPick: (kind: 'blank' | 'technical') => void
}

/** Tela mostrada quando o caderno do card ainda está vazio — escolher entre
 * começar em branco ou já com as seções do modelo de documentação técnica
 * (ver templates.ts). */
export default function TemplatePicker({ onPick }: TemplatePickerProps): JSX.Element {
  return (
    <div className="notebook-template-picker">
      <p className="notebook-template-picker__hint">Este card ainda não tem caderno. Como quer começar?</p>
      <div className="notebook-template-picker__options">
        <button type="button" className="notebook-template-picker__option" onClick={() => onPick('blank')}>
          <strong>Caderno em branco</strong>
          <span>Comece do zero.</span>
        </button>
        <button type="button" className="notebook-template-picker__option" onClick={() => onPick('technical')}>
          <strong>Modelo de documentação técnica</strong>
          <span>
            Contexto, evidências, investigação, consultas, causa, solução, testes, pendências e tickets
            relacionados — tudo editável depois.
          </span>
        </button>
      </div>
    </div>
  )
}
