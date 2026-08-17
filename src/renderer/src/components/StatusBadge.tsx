export default function StatusBadge({ name, isDone }: { name: string; isDone?: boolean }): JSX.Element {
  return <span className={`status-badge ${isDone ? 'status-badge--done' : ''}`}>{name}</span>
}
