import { useState, useRef, useEffect } from 'react'
import { exportSVG, exportPNG, exportJPEG } from '../lib/export'
import styles from './Toolbar.module.css'

const LEGEND = [
  { type: 'service',  color: '#4f70f5' },
  { type: 'database', color: '#22c7a0' },
  { type: 'queue',    color: '#d97706' },
  { type: 'client',   color: '#9b7df8' },
  { type: 'gateway',  color: '#e5607a' },
]

export default function Toolbar({ projectName, diagram, theme, onThemeToggle, canUndo, onUndo, onClear }) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className={styles.toolbar}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Drafted
        </div>
        {projectName && <span className={styles.projectName}>{projectName}</span>}
      </div>

      <div className={styles.legend}>
        {LEGEND.map(l => (
          <div key={l.type} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: l.color }} />
            {l.type}
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        {/* Export dropdown */}
        <div className={styles.exportWrap} ref={exportRef}>
          <button
            className={styles.btn}
            onClick={() => setExportOpen(o => !o)}
            disabled={!diagram?.nodes?.length}
          >
            Export ↓
          </button>
          {exportOpen && (
            <div className={styles.dropdown}>
              <button className={styles.dropItem} onClick={() => { exportSVG(diagram, theme); setExportOpen(false) }}>
                <span className={styles.dropIcon}>⬡</span> SVG
              </button>
              <button className={styles.dropItem} onClick={() => { exportPNG(diagram, theme); setExportOpen(false) }}>
                <span className={styles.dropIcon}>⬡</span> PNG
              </button>
              <button className={styles.dropItem} onClick={() => { exportJPEG(diagram, theme); setExportOpen(false) }}>
                <span className={styles.dropIcon}>⬡</span> JPEG
              </button>
            </div>
          )}
        </div>

        <button className={styles.btn} onClick={onUndo} disabled={!canUndo}>↩ Undo</button>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={onClear}>Clear</button>

        {/* Theme toggle */}
        <button
          className={`${styles.btn} ${styles.iconOnly}`}
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  )
}
