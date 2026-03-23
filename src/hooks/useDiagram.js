import { useState, useCallback } from 'react'
import { generateDiagram, resetConversation } from '../lib/gemini'
import { autoLayout } from '../lib/layout'

const EMPTY = { nodes: [], edges: [], nextId: 1 }

function withLayout(diagram) {
  return { ...diagram, nodes: autoLayout(diagram.nodes, diagram.edges) }
}

export function useDiagram(initialDiagram = EMPTY) {
  const [diagram, setDiagram]   = useState(() => initialDiagram.nodes?.length ? initialDiagram : EMPTY)
  const [history, setHistory]   = useState([])
  const [status, setStatus]     = useState({ text: 'Ready', type: 'idle' })
  const [pending, setPending]   = useState(null)  // pending diagram awaiting confirmation

  const snapshot = useCallback((current) => {
    setHistory(h => [...h.slice(-29), JSON.stringify(current)])
  }, [])

  const reset = useCallback((newDiagram = EMPTY) => {
    setDiagram(newDiagram.nodes?.length ? newDiagram : EMPTY)
    setHistory([])
    setPending(null)
    setStatus({ text: 'Ready', type: 'idle' })
    resetConversation()  // clear Gemini history on project switch
  }, [])

  const applyDiagram = useCallback((incoming, current) => {
    let next
    if (incoming.patch && current.nodes.length > 0) {
      const existingLabels = new Set(current.nodes.map(n => n.label.toLowerCase()))
      const idRemap = {}
      let nextId = current.nextId
      const newNodes = [...current.nodes]
      ;(incoming.nodes || []).forEach(n => {
        if (!existingLabels.has(n.label.toLowerCase())) {
          const newId = String(nextId++)
          idRemap[n.id] = newId
          newNodes.push({ ...n, id: newId })
        } else {
          const ex = current.nodes.find(x => x.label.toLowerCase() === n.label.toLowerCase())
          if (ex) idRemap[n.id] = ex.id
        }
      })
      const newEdges = [...current.edges]
      ;(incoming.edges || []).forEach(e => {
        const from = idRemap[e.from] ?? e.from
        const to   = idRemap[e.to]   ?? e.to
        if (!newEdges.some(x => x.from === from && x.to === to))
          newEdges.push({ ...e, from, to })
      })
      next = { nodes: newNodes, edges: newEdges, nextId }
    } else {
      const nodes = incoming.nodes || []
      next = { nodes, edges: incoming.edges || [], nextId: nodes.length + 1 }
    }
    return withLayout(next)
  }, [])

  // Streaming partial update — fires while user is still speaking
  // Shows a "preview" by applying directly but marking it as streaming
  const processPartial = useCallback(async (text) => {
    setStatus({ text: `Updating… "${text.slice(-40)}"`, type: 'streaming' })
    try {
      const incoming = await generateDiagram(text, { nodes: diagram.nodes, edges: diagram.edges })
      setDiagram(current => applyDiagram(incoming, current))
      setStatus({ text: 'Listening…', type: 'streaming' })
    } catch (_) {
      // Silently ignore streaming errors — final result will retry
    }
  }, [diagram, applyDiagram])

  // Final update — fires on Stop, snapshots for undo
  const processFinal = useCallback(async (text) => {
    setStatus({ text: 'Finalising…', type: 'loading' })
    try {
      const incoming = await generateDiagram(text, { nodes: diagram.nodes, edges: diagram.edges })
      setDiagram(current => {
        snapshot(current)
        return applyDiagram(incoming, current)
      })
      setStatus({ text: 'Updated ✓', type: 'success' })
    } catch (err) {
      setStatus({ text: 'Error: ' + err.message, type: 'error' })
    }
  }, [diagram, snapshot, applyDiagram])

  // Text input — same as final
  const process = useCallback(async (text) => {
    setStatus({ text: 'Thinking…', type: 'loading' })
    try {
      const incoming = await generateDiagram(text, { nodes: diagram.nodes, edges: diagram.edges })
      setDiagram(current => {
        snapshot(current)
        return applyDiagram(incoming, current)
      })
      setStatus({ text: 'Updated ✓', type: 'success' })
    } catch (err) {
      setStatus({ text: 'Error: ' + err.message, type: 'error' })
    }
  }, [diagram, snapshot, applyDiagram])

  const undo = useCallback(() => {
    if (!history.length) { setStatus({ text: 'Nothing to undo', type: 'idle' }); return }
    setHistory(h => {
      const prev = JSON.parse(h[h.length - 1])
      setDiagram(prev)
      setStatus({ text: 'Undone', type: 'idle' })
      return h.slice(0, -1)
    })
  }, [history])

  const clear = useCallback(() => {
    setDiagram(current => { snapshot(current); return EMPTY })
    resetConversation()
    setStatus({ text: 'Cleared', type: 'idle' })
  }, [snapshot])

  const updateNodePosition = useCallback((id, x, y) => {
    setDiagram(d => ({ ...d, nodes: d.nodes.map(n => n.id === id ? { ...n, x, y } : n) }))
  }, [])

  const applyManualChange = useCallback((newDiagram) => {
    setDiagram(current => {
      snapshot(current)
      return newDiagram
    })
  }, [snapshot])

  return {
    diagram, status, pending,
    process, processPartial, processFinal,
    undo, clear, reset,
    updateNodePosition,
    setDiagram: applyManualChange,
    canUndo: history.length > 0,
  }
}
