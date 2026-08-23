interface ChangelogEntry {
  version: string
  date: string
  title: string
  description: string
}

/**
 * Changelog interno do LearnDeck — por enquanto uma lista estática; dá pra
 * evoluir pra vir do backend (ex. tabela `changelog` ou arquivo JSON lido no
 * main) mantendo o mesmo formato de ChangelogEntry.
 */
const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: '2026-08-23',
    title: 'Nova identidade visual e ação global de criação de ticket',
    description:
      'Paleta azul com detalhes dourados, sino agora abre Atualizações, criação de ticket virou uma ação única no topo do quadro (com escolha de coluna), e matérias novas nascem só com "Coluna principal".'
  },
  {
    version: '0.2.0',
    date: '2026-08-22',
    title: 'Layout responsivo para mobile',
    description: 'Sidebar passa a poder ser minimizada e o quadro se adapta a telas menores.'
  }
]

export default function UpdatesPage(): JSX.Element {
  return (
    <div className="dashboard">
      <section className="card-section">
        <h3>Atualizações</h3>
        <ul className="notifications-list">
          {CHANGELOG.map((entry, i) => (
            <li key={`${entry.version}-${i}`} className="notifications-list__item">
              <div className="notifications-list__main">
                <span className="notifications-list__message">
                  v{entry.version} · {entry.title}
                </span>
                <span className="notifications-list__meta">
                  {entry.description} · {entry.date}
                </span>
              </div>
            </li>
          ))}
          {CHANGELOG.length === 0 && <p className="empty-hint">Nenhuma atualização registrada ainda.</p>}
        </ul>
      </section>
    </div>
  )
}
