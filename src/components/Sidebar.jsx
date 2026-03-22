import { useState } from 'react'
import styles from './Sidebar.module.css'

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return Math.floor(diff / 86400000) + 'd ago'
}

export default function Sidebar({ projects, activeId, onSelect, onCreate, onRename, onDelete }) {
  const [newName, setNewName]   = useState('')
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal]   = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreate(newName.trim())
    setNewName('')
    setCreating(false)
  }

  const startRename = (e, p) => {
    e.stopPropagation()
    setRenamingId(p.id)
    setRenameVal(p.name)
  }

  const commitRename = (id) => {
    if (renameVal.trim()) onRename(id, renameVal.trim())
    setRenamingId(null)
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.title}>Projects</span>
        <button className={styles.newBtn} onClick={() => setCreating(true)} title="New project">+</button>
      </div>

      {creating && (
        <div className={styles.createRow}>
          <input
            className={styles.nameInput}
            autoFocus
            placeholder="Project name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
          />
          <button className={styles.confirmBtn} onClick={handleCreate}>↵</button>
        </div>
      )}

      <div className={styles.list}>
        {projects.length === 0 && !creating && (
          <p className={styles.empty}>No projects yet.<br/>Click + to create one.</p>
        )}
        {projects.map(p => (
          <div
            key={p.id}
            className={`${styles.item} ${p.id === activeId ? styles.active : ''}`}
            onClick={() => onSelect(p.id)}
          >
            <div className={styles.itemMain}>
              {renamingId === p.id ? (
                <input
                  className={styles.inlineInput}
                  autoFocus
                  value={renameVal}
                  onClick={e => e.stopPropagation()}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(p.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onBlur={() => commitRename(p.id)}
                />
              ) : (
                <span className={styles.itemName}>{p.name}</span>
              )}
              <span className={styles.itemMeta}>
                {p.diagram?.nodes?.length || 0} nodes · {timeAgo(p.updatedAt)}
              </span>
            </div>
            <div className={styles.itemActions}>
              <button
                className={styles.iconBtn}
                title="Rename"
                onClick={e => startRename(e, p)}
              >✎</button>
              <button
                className={`${styles.iconBtn} ${styles.danger}`}
                title="Delete"
                onClick={e => { e.stopPropagation(); onDelete(p.id) }}
              >✕</button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
