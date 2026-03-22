/**
 * Auto-layout: iterative layered layout (no recursion, cycle-safe)
 */

const NODE_W = 160  // estimated node width + gap
const NODE_H = 56   // estimated node height
const H_GAP  = 60
const V_GAP  = 90
const PAD_X  = 60
const PAD_Y  = 60

export function autoLayout(nodes, edges) {
  if (nodes.length === 0) return nodes

  const ids = nodes.map(n => n.id)

  // Build adjacency maps
  const out = {}  // id -> Set of ids
  const inc = {}  // id -> count of incoming edges
  ids.forEach(id => { out[id] = new Set(); inc[id] = 0 })

  edges.forEach(e => {
    if (out[e.from] && inc[e.to] !== undefined && e.from !== e.to) {
      out[e.from].add(e.to)
      inc[e.to]++
    }
  })

  // --- Kahn's algorithm to get a topological order (cycle-safe) ---
  // Any back-edges in cycles are simply ignored — nodes in cycles
  // get treated as roots and placed at layer 0.
  const rank = {}
  const queue = ids.filter(id => inc[id] === 0)
  const inDegree = { ...inc }

  // Iterative BFS-based rank assignment
  let head = 0
  while (head < queue.length) {
    const id = queue[head++]
    const r = rank[id] ?? 0
    out[id].forEach(to => {
      rank[to] = Math.max(rank[to] ?? 0, r + 1)
      inDegree[to]--
      if (inDegree[to] === 0) queue.push(to)
    })
  }

  // Any node not reached (part of a cycle) gets rank 0
  ids.forEach(id => { if (rank[id] === undefined) rank[id] = 0 })

  // Group by rank
  const layers = {}
  ids.forEach(id => {
    const r = rank[id]
    if (!layers[r]) layers[r] = []
    layers[r].push(id)
  })

  const sortedRanks = Object.keys(layers).map(Number).sort((a, b) => a - b)

  // --- Barycenter ordering to reduce crossings (iterative, 3 passes) ---
  for (let pass = 0; pass < 3; pass++) {
    sortedRanks.forEach((r, ri) => {
      if (ri === 0) return
      const prevLayer = layers[sortedRanks[ri - 1]]
      const prevPos = {}
      prevLayer.forEach((id, i) => { prevPos[id] = i })

      layers[r].sort((a, b) => {
        // incoming neighbours in previous layer
        const aParents = edges.filter(e => e.to === a && prevPos[e.from] !== undefined).map(e => prevPos[e.from])
        const bParents = edges.filter(e => e.to === b && prevPos[e.from] !== undefined).map(e => prevPos[e.from])
        const aBar = aParents.length ? aParents.reduce((s, v) => s + v, 0) / aParents.length : Infinity
        const bBar = bParents.length ? bParents.reduce((s, v) => s + v, 0) / bParents.length : Infinity
        return aBar - bBar
      })
    })
  }

  // --- Assign x/y positions ---
  const positions = {}
  sortedRanks.forEach((r, ri) => {
    const layer = layers[r]
    const totalW = layer.length * NODE_W + Math.max(0, layer.length - 1) * H_GAP
    const startX = PAD_X + Math.max(0, (800 - totalW) / 2)
    layer.forEach((id, ci) => {
      positions[id] = {
        x: startX + ci * (NODE_W + H_GAP),
        y: PAD_Y  + ri * (NODE_H + V_GAP),
      }
    })
  })

  // --- Iterative collision nudge ---
  const placed = nodes.map(n => ({ ...n, ...positions[n.id] }))
  for (let iter = 0; iter < 15; iter++) {
    let moved = false
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i], b = placed[j]
        const overlapX = (NODE_W + H_GAP / 2) - Math.abs(a.x - b.x)
        const overlapY = (NODE_H + V_GAP / 2) - Math.abs(a.y - b.y)
        if (overlapX > 0 && overlapY > 0) {
          const push = overlapX < overlapY
            ? overlapX / 2 + 2
            : overlapY / 2 + 2
          if (overlapX < overlapY) {
            if (a.x <= b.x) { a.x -= push; b.x += push }
            else             { a.x += push; b.x -= push }
          } else {
            if (a.y <= b.y) { a.y -= push; b.y += push }
            else             { a.y += push; b.y -= push }
          }
          moved = true
        }
      }
    }
    if (!moved) break
  }

  // Clamp to minimum padding
  placed.forEach(n => {
    n.x = Math.max(PAD_X, n.x)
    n.y = Math.max(PAD_Y, n.y)
  })

  return placed
}
