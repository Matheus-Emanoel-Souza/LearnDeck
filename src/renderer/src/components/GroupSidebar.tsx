import { useState } from 'react'
import type { GroupNode } from '../lib/groupTree'

interface GroupSidebarProps {
  tree: GroupNode[]
  selectedGroupId: string | null
  onSelect: (groupId: string) => void
  onCreateGroup: (name: string, parentGroupId: string | null) => Promise<void>
  onDeleteGroup: (groupId: string) => Promise<void>
  collapsed: boolean
  onToggleCollapse: () => void
  /** Em telas estreitas a lista deixa de ser barra lateral e vira a primeira
   *  tela da aba Quadro — sem botão de minimizar, sem drawer, sem backdrop. */
  asScreen?: boolean
}

/**
 * Barra lateral de matérias/projetos. `collapsed` tem dois significados
 * conforme a largura da tela (ver media query em global.css):
 * - Desktop: encolhe pra uma faixa fina só com o botão de alternar.
 * - Mobile (<=720px): vira um "drawer" que fica fora da tela até ser aberto.
 * O botão de alternar some junto quando o drawer fecha no mobile, então
 * quem reabre é o `.sidebar-mobile-toggle` renderizado pelo StudyPanel.
 */
export default function GroupSidebar({
  tree,
  selectedGroupId,
  onSelect,
  onCreateGroup,
  onDeleteGroup,
  collapsed,
  onToggleCollapse,
  asScreen
}: GroupSidebarProps): JSX.Element {
  if (asScreen) {
    return (
      <section className="group-screen">
        <header className="group-screen__header">
          <h2>Matérias &amp; projetos</h2>
        </header>

        {tree.length === 0 ? (
          <div className="group-screen__empty">
            <p className="group-screen__empty-title">Nenhum projeto ainda</p>
            <p className="group-screen__empty-text">
              Crie seu primeiro projeto para começar a organizar os estudos.
            </p>
            <NewGroupForm
              parentGroupId={null}
              label="+ Criar novo projeto"
              onCreateGroup={onCreateGroup}
            />
          </div>
        ) : (
          <>
            <div className="group-list group-list--screen">
              {tree.map((node) => (
                <GroupTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedGroupId={selectedGroupId}
                  onSelect={onSelect}
                  onCreateGroup={onCreateGroup}
                  onDeleteGroup={onDeleteGroup}
                />
              ))}
            </div>

            <NewGroupForm
              parentGroupId={null}
              label="+ Novo projeto"
              onCreateGroup={onCreateGroup}
            />
          </>
        )}
      </section>
    )
  }

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar__topbar">
          {!collapsed && <h2 className="sidebar__title">Matérias &amp; projetos</h2>}
          <button
            type="button"
            className="sidebar__collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir barra lateral' : 'Minimizar barra lateral'}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Minimizar barra lateral'}
            aria-expanded={!collapsed}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="group-list">
              {tree.length === 0 && <p className="empty-hint">Nenhum grupo ainda. Crie o primeiro abaixo.</p>}
              {tree.map((node) => (
                <GroupTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedGroupId={selectedGroupId}
                  onSelect={onSelect}
                  onCreateGroup={onCreateGroup}
                  onDeleteGroup={onDeleteGroup}
                />
              ))}
            </div>

            <NewGroupForm parentGroupId={null} label="+ Novo grupo raiz" onCreateGroup={onCreateGroup} />
          </>
        )}
      </aside>

      {/* No mobile funciona como fundo escurecido do drawer; no desktop fica invisível (ver CSS). */}
      {!collapsed && <div className="sidebar-backdrop" onClick={onToggleCollapse} />}
    </>
  )
}

function GroupTreeItem({
  node,
  depth,
  selectedGroupId,
  onSelect,
  onCreateGroup,
  onDeleteGroup
}: {
  node: GroupNode
  depth: number
  selectedGroupId: string | null
  onSelect: (groupId: string) => void
  onCreateGroup: (name: string, parentGroupId: string | null) => Promise<void>
  onDeleteGroup: (groupId: string) => Promise<void>
}): JSX.Element {
  const [showChildForm, setShowChildForm] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleDelete(): Promise<void> {
    if (busy) return
    if (!window.confirm(`Excluir a matéria "${node.name}"? Só é possível se ela estiver vazia.`)) return
    setBusy(true)
    try {
      await onDeleteGroup(node.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="group-tree-item">
      <div
        className={`group-row ${node.id === selectedGroupId ? 'group-row--active' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button className="group-row__name" onClick={() => onSelect(node.id)}>
          {node.name}
        </button>
        <button
          className="group-row__add"
          title="Adicionar subgrupo"
          onClick={() => setShowChildForm((v) => !v)}
        >
          +
        </button>
        <button
          className="group-row__delete"
          title="Excluir matéria"
          disabled={busy}
          onClick={() => void handleDelete()}
        >
          ✕
        </button>
      </div>

      {showChildForm && (
        <div style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
          <NewGroupForm
            parentGroupId={node.id}
            label="Adicionar subgrupo"
            compact
            autoOpen
            onCreateGroup={async (name, parentGroupId) => {
              await onCreateGroup(name, parentGroupId)
              setShowChildForm(false)
            }}
          />
        </div>
      )}

      {node.children.map((child) => (
        <GroupTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedGroupId={selectedGroupId}
          onSelect={onSelect}
          onCreateGroup={onCreateGroup}
          onDeleteGroup={onDeleteGroup}
        />
      ))}
    </div>
  )
}

function NewGroupForm({
  parentGroupId,
  label,
  compact,
  autoOpen,
  onCreateGroup
}: {
  parentGroupId: string | null
  label: string
  compact?: boolean
  autoOpen?: boolean
  onCreateGroup: (name: string, parentGroupId: string | null) => Promise<void>
}): JSX.Element {
  const [open, setOpen] = useState(Boolean(autoOpen))
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button className={compact ? 'link-button' : 'secondary-button'} onClick={() => setOpen(true)}>
        {label}
      </button>
    )
  }

  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim() || busy) return
        setBusy(true)
        try {
          await onCreateGroup(name, parentGroupId)
          setName('')
          setOpen(false)
        } finally {
          setBusy(false)
        }
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do grupo"
        disabled={busy}
      />
      <button type="submit" disabled={busy || !name.trim()}>
        Criar
      </button>
      <button type="button" className="link-button" onClick={() => setOpen(false)} disabled={busy}>
        Cancelar
      </button>
    </form>
  )
}
