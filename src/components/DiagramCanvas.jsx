import { useRef, useEffect, useCallback, useState } from 'react'
import styles from './DiagramCanvas.module.css'

const TYPE_STYLES = {
  service:  { border: '#4f70f5', bg: 'rgba(79,112,245,0.1)',  label: '#93b4ff' },
  database: { border: '#22c7a0', bg: 'rgba(34,199,160,0.1)',  label: '#6ee7c7' },
  queue:    { border: '#d97706', bg: 'rgba(217,119,6,0.1)',   label: '#fbbf24' },
  client:   { border: '#9b7df8', bg: 'rgba(155,125,248,0.1)', label: '#c4b5fd' },
  gateway:  { border: '#e5607a', bg: 'rgba(229,96,122,0.1)',  label: '#fda4b8' },
}
const TYPES = Object.keys(TYPE_STYLES)
const NODE_W   = 80
const NODE_H   = 28
const MIN_ZOOM = 0.2
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1

function getStyle(type) { return TYPE_STYLES[type] || TYPE_STYLES.service }

export default function DiagramCanvas({ diagram, theme, onNodeMove, onDiagramChange }) {
  const wrapRef  = useRef(null)
  const svgRef   = useRef(null)
  const nodesRef = useRef({})

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const transformRef = useRef(transform)
  transformRef.current = transform

  // Editing state
  const [editingNode, setEditingNode]   = useState(null)  // { id, label, sub, type }
  const [editingEdge, setEditingEdge]   = useState(null)  // { index, label }
  const [connectMode, setConnectMode]   = useState(false)
  const [connectFrom, setConnectFrom]   = useState(null)  // node id

  // Auto-fit on node changes
  useEffect(() => {
    if (diagram.nodes.length === 0) return
    fitDiagram(diagram.nodes, wrapRef.current, setTransform)
  }, [diagram.nodes.length])

  // Redraw edges on diagram or theme change
  useEffect(() => {
    requestAnimationFrame(() => drawEdges(svgRef.current, diagram, theme, (idx) => {
      const edge = diagram.edges[idx]
      if (!edge) return
      setEditingEdge({ index: idx, label: edge.label || '' })
      setEditingNode(null)
    }))
  }, [diagram, theme])

  // Zoom
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = wrap.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      setTransform(t => {
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
        const s = Math.min(Math.max(t.scale + delta, MIN_ZOOM), MAX_ZOOM)
        const r = s / t.scale
        return { scale: s, x: mx - r * (mx - t.x), y: my - r * (my - t.y) }
      })
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
  }, [])

  // Pan
  const handleWrapMouseDown = useCallback((e) => {
    const isBackground =
      e.target === wrapRef.current ||
      e.target === svgRef.current
    if (!isBackground) return
    // Close any open popover on background click
    setEditingNode(null)
    setEditingEdge(null)
    if (connectMode && e.target === wrapRef.current) return
    e.preventDefault()
    const startX = e.clientX, startY = e.clientY
    const origX = transformRef.current.x, origY = transformRef.current.y
    const onMove = (mv) => setTransform(t => ({ ...t, x: origX + mv.clientX - startX, y: origY + mv.clientY - startY }))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [connectMode])

  // Node drag + double-click to edit + connect mode click
  const makeNodeInteractive = useCallback((el, node) => {
    let dragMoved = false

    el.addEventListener('mousedown', (e) => {
      // In connect mode, clicks select nodes to connect — don't drag
      if (connectMode) return
      e.preventDefault()
      e.stopPropagation()
      dragMoved = false
      const startX = e.clientX, startY = e.clientY
      const origX = node.x, origY = node.y
      el.style.cursor = 'grabbing'

      const onMove = (mv) => {
        const scale = transformRef.current.scale
        const dx = (mv.clientX - startX) / scale
        const dy = (mv.clientY - startY) / scale
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true
        node.x = origX + dx
        node.y = origY + dy
        el.style.left = node.x + 'px'
        el.style.top  = node.y + 'px'
        requestAnimationFrame(() => drawEdges(svgRef.current, diagram, theme, () => {}))
      }
      const onUp = (mv) => {
        el.style.cursor = 'grab'
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        const scale = transformRef.current.scale
        onNodeMove(node.id, origX + (mv.clientX - startX) / scale, origY + (mv.clientY - startY) / scale)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })

    // Double-click → open node editor
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      if (connectMode) return
      setEditingNode({ id: node.id, label: node.label, sub: node.sub || '', type: node.type || 'service' })
      setEditingEdge(null)
    })

    // Click in connect mode
    el.addEventListener('click', (e) => {
      if (!connectMode) return
      e.stopPropagation()
      if (!connectFrom) {
        setConnectFrom(node.id)
      } else if (connectFrom !== node.id) {
        // Create edge
        const newEdge = { from: connectFrom, to: node.id, label: '' }
        const already = diagram.edges.some(ed => ed.from === connectFrom && ed.to === node.id)
        if (!already) {
          onDiagramChange({ ...diagram, edges: [...diagram.edges, newEdge] })
        }
        setConnectFrom(null)
        setConnectMode(false)
      }
    })
  }, [connectMode, connectFrom, diagram, theme, onNodeMove, onDiagramChange])

  // Save node edit
  const commitNodeEdit = () => {
    if (!editingNode) return
    const updated = diagram.nodes.map(n =>
      n.id === editingNode.id
        ? { ...n, label: editingNode.label, sub: editingNode.sub, type: editingNode.type }
        : n
    )
    onDiagramChange({ ...diagram, nodes: updated })
    setEditingNode(null)
  }

  // Delete node
  const deleteNode = (id) => {
    onDiagramChange({
      ...diagram,
      nodes: diagram.nodes.filter(n => n.id !== id),
      edges: diagram.edges.filter(e => e.from !== id && e.to !== id),
    })
    setEditingNode(null)
  }

  // Save edge edit
  const commitEdgeEdit = () => {
    if (!editingEdge) return
    const updated = diagram.edges.map((e, i) =>
      i === editingEdge.index ? { ...e, label: editingEdge.label } : e
    )
    onDiagramChange({ ...diagram, edges: updated })
    setEditingEdge(null)
  }

  // Delete edge
  const deleteEdge = (index) => {
    onDiagramChange({ ...diagram, edges: diagram.edges.filter((_, i) => i !== index) })
    setEditingEdge(null)
  }

  // Add blank node
  const addNode = () => {
    const id = String(Date.now())
    const newNode = { id, label: 'New service', sub: '', type: 'service', x: 100, y: 100 }
    onDiagramChange({ ...diagram, nodes: [...diagram.nodes, newNode] })
    setEditingNode({ id, label: 'New service', sub: '', type: 'service' })
  }

  const fitToScreen = useCallback(() => {
    if (diagram.nodes.length === 0) return
    fitDiagram(diagram.nodes, wrapRef.current, setTransform)
  }, [diagram.nodes])

  // Get screen position of a node for popover placement
  const getNodeScreenPos = (nodeId) => {
    const node = diagram.nodes.find(n => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }
    const t = transformRef.current
    return {
      x: node.x * t.scale + t.x,
      y: node.y * t.scale + t.y,
    }
  }

  const isEmpty = diagram.nodes.length === 0

  return (
    <div className={styles.wrap} ref={wrapRef} onMouseDown={handleWrapMouseDown}>

      {/* Toolbar: zoom + add node + connect mode */}
      <div className={styles.zoomControls}>
        <button className={styles.zoomBtn} title="Add node" onClick={addNode}>＋</button>
        <div className={styles.divider} />
        <button
          className={`${styles.zoomBtn} ${connectMode ? styles.active : ''}`}
          title="Draw arrow between nodes"
          onClick={() => { setConnectMode(m => !m); setConnectFrom(null) }}
        >⤳</button>
        <div className={styles.divider} />
        <button className={styles.zoomBtn} onClick={() => setTransform(t => ({ ...t, scale: Math.min(t.scale + ZOOM_STEP, MAX_ZOOM) }))}>+</button>
        <span className={styles.zoomLevel}>{Math.round(transform.scale * 100)}%</span>
        <button className={styles.zoomBtn} onClick={() => setTransform(t => ({ ...t, scale: Math.max(t.scale - ZOOM_STEP, MIN_ZOOM) }))}>−</button>
        <button className={styles.zoomBtn} title="Fit to screen" onClick={fitToScreen}>⊡</button>
      </div>

      {/* Connect mode hint */}
      {connectMode && (
        <div className={styles.connectHint}>
          {connectFrom
            ? `Click destination node — or click background to cancel`
            : `Click source node to start drawing an arrow`}
        </div>
      )}

      {/* Scene */}
      <div
        className={styles.scene}
        style={{ transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})` }}
      >
        <svg ref={svgRef} className={styles.svg}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          </defs>
        </svg>

        {diagram.nodes.map(node => {
          const s = getStyle(node.type)
          const isConnectSource = connectFrom === node.id
          return (
            <div
              key={node.id}
              ref={el => {
                if (el) { nodesRef.current[node.id] = el; makeNodeInteractive(el, node) }
                else    { delete nodesRef.current[node.id] }
              }}
              className={`${styles.node} ${connectMode ? styles.nodeConnectable : ''} ${isConnectSource ? styles.nodeSource : ''}`}
              style={{ left: node.x, top: node.y, borderColor: s.border, background: s.bg }}
            >
              <span className={styles.nodeLabel} style={{ color: s.label }}>{node.label}</span>
              {node.sub && <span className={styles.nodeSub}>{node.sub}</span>}
            </div>
          )
        })}
      </div>

      {/* Node edit popover */}
      {editingNode && (() => {
        const pos = getNodeScreenPos(editingNode.id)
        return (
          <div
            className={styles.popover}
            style={{ left: pos.x + 170 * transform.scale + 12, top: pos.y }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className={styles.popoverTitle}>Edit node</div>
            <label className={styles.popLabel}>Label</label>
            <input
              className={styles.popInput}
              autoFocus
              value={editingNode.label}
              onChange={e => setEditingNode(n => ({ ...n, label: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && commitNodeEdit()}
            />
            <label className={styles.popLabel}>Subtitle</label>
            <input
              className={styles.popInput}
              placeholder="optional"
              value={editingNode.sub}
              onChange={e => setEditingNode(n => ({ ...n, sub: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && commitNodeEdit()}
            />
            <label className={styles.popLabel}>Type</label>
            <div className={styles.typeGrid}>
              {TYPES.map(t => (
                <button
                  key={t}
                  className={`${styles.typeBtn} ${editingNode.type === t ? styles.typeBtnActive : ''}`}
                  style={{ borderColor: TYPE_STYLES[t].border, color: TYPE_STYLES[t].label }}
                  onClick={() => setEditingNode(n => ({ ...n, type: t }))}
                >{t}</button>
              ))}
            </div>
            <div className={styles.popActions}>
              <button className={styles.popSave} onClick={commitNodeEdit}>Save</button>
              <button className={styles.popDelete} onClick={() => deleteNode(editingNode.id)}>Delete</button>
            </div>
          </div>
        )
      })()}

      {/* Edge edit popover — centered in viewport */}
      {editingEdge && (
        <div
          className={styles.popover}
          style={{ left: '50%', top: '40%', transform: 'translate(-50%,-50%)' }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className={styles.popoverTitle}>Edit arrow</div>
          <label className={styles.popLabel}>Label</label>
          <input
            className={styles.popInput}
            autoFocus
            placeholder="e.g. HTTP, publishes, reads..."
            value={editingEdge.label}
            onChange={e => setEditingEdge(ed => ({ ...ed, label: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && commitEdgeEdit()}
          />
          <div className={styles.popActions}>
            <button className={styles.popSave} onClick={commitEdgeEdit}>Save</button>
            <button className={styles.popDelete} onClick={() => deleteEdge(editingEdge.index)}>Delete arrow</button>
          </div>
        </div>
      )}

      {isEmpty && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◎</div>
          <p>Describe your system design</p>
          <span>"React frontend → Node API → Postgres database"</span>
        </div>
      )}
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────

// Get the point where a line from (cx,cy) in direction (dx,dy) exits a rect of given half-dims
function rectIntersect(cx, cy, tx, ty, hw, hh) {
  const dx = tx - cx, dy = ty - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const scaleX = hw / Math.abs(dx || 1e-9)
  const scaleY = hh / Math.abs(dy || 1e-9)
  const scale  = Math.min(scaleX, scaleY)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

function drawEdges(svg, diagram, theme, onEdgeClick) {
  if (!svg) return
  svg.querySelectorAll('line, text.elabel').forEach(e => e.remove())

  const isDark     = theme !== 'light'
  const edgeColor  = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)'
  const labelColor = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.45)'

  // Estimated node half-dimensions (match CSS padding + typical text)
  const HW = 80  // half-width  (~160px node)
  const HH = 22  // half-height (~44px node)

  diagram.edges.forEach((edge, idx) => {
    const fn = diagram.nodes.find(n => n.id === edge.from)
    const tn = diagram.nodes.find(n => n.id === edge.to)
    if (!fn || !tn) return

    // Node centres
    const cx1 = fn.x + HW, cy1 = fn.y + HH
    const cx2 = tn.x + HW, cy2 = tn.y + HH

    // Border intersection points
    const p1 = rectIntersect(cx1, cy1, cx2, cy2, HW, HH)
    const p2 = rectIntersect(cx2, cy2, cx1, cy1, HW, HH)

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y)
    line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y)
    line.setAttribute('stroke', edgeColor)
    line.setAttribute('stroke-width', '1.5')
    line.setAttribute('marker-end', 'url(#arr)')
    svg.appendChild(line)

    // Wide transparent hit line — pointer-events via class
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    hit.setAttribute('x1', p1.x); hit.setAttribute('y1', p1.y)
    hit.setAttribute('x2', p2.x); hit.setAttribute('y2', p2.y)
    hit.setAttribute('stroke', 'rgba(0,0,0,0)')
    hit.setAttribute('stroke-width', '14')
    hit.setAttribute('class', 'hit')
    hit.addEventListener('click', (e) => { e.stopPropagation(); onEdgeClick(idx) })
    svg.appendChild(hit)

    if (edge.label) {
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      txt.setAttribute('class', 'elabel')
      txt.setAttribute('x', (p1.x + p2.x) / 2)
      txt.setAttribute('y', (p1.y + p2.y) / 2 - 8)
      txt.setAttribute('text-anchor', 'middle')
      txt.setAttribute('font-size', '11')
      txt.setAttribute('font-family', 'DM Mono, monospace')
      txt.setAttribute('fill', labelColor)
      txt.textContent = edge.label
      svg.appendChild(txt)
    }
  })
}

function fitDiagram(nodes, wrap, setTransform) {
  if (!wrap || nodes.length === 0) return
  const ww = wrap.offsetWidth, wh = wrap.offsetHeight
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y)
  const minX = Math.min(...xs), minY = Math.min(...ys)
  const maxX = Math.max(...xs) + 160, maxY = Math.max(...ys) + 60
  const cw = maxX - minX, ch = maxY - minY
  const scale = Math.min(Math.max(Math.min((ww-80)/cw, (wh-80)/ch), MIN_ZOOM), MAX_ZOOM)
  setTransform({ scale, x: (ww - cw*scale)/2 - minX*scale, y: (wh - ch*scale)/2 - minY*scale })
}
