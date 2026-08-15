import type { Group } from '@shared/types'

export interface GroupNode extends Group {
  children: GroupNode[]
}

/** Monta a árvore de grupos a partir da lista plana vinda do banco (parentGroupId). */
export function buildGroupTree(groups: Group[]): GroupNode[] {
  const nodesById = new Map<string, GroupNode>(groups.map((g) => [g.id, { ...g, children: [] }]))
  const roots: GroupNode[] = []

  for (const node of nodesById.values()) {
    if (node.parentGroupId && nodesById.has(node.parentGroupId)) {
      nodesById.get(node.parentGroupId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
