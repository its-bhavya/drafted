/**
 * Tier-aware layered layout.
 *
 * Architecture diagrams naturally follow a tier pattern:
 *   client → gateway → service → database / queue
 *
 * This layout engine uses that semantic knowledge as a strong prior
 * before falling back to topological rank — which eliminates most
 * spaghetti by keeping similar node types at the same visual level.
 */

const NODE_W = 160
const NODE_H = 56
const H_GAP  = 70
const V_GAP  = 100
const PAD_X  = 60
const PAD_Y  = 60

// Semantic tier order — lower number = higher on screen
const TYPE_TIER = {
  client:   0,
  gateway:  1,
  service:  2,
  queue:    3,
  database: 4,
}

function tierOf(node) {
  return TYPE_TIER[node.type] ?? 2  // default to service tier
}

export function autoLayout(nodes, edges) {
  if (nodes.length === 0) return nodes

  const ids = nodes.map(n => n.id)
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  // Build adjacency
  const out = {}, inc = {}
  ids.forEach(id => { out[id] = new Set(); inc[id] = 0 })
  edges.forEach(e => {
    if (out[e.from] && inc[e.to] !== undefined && e.from !== e.to) {
      out[e.from].add(e.to)
      inc[e.to]++
    }
  })

  // --- Step 1: Assign topological rank via Kahn's (cycle-safe) ---
  const topoRank = {}
  const queue = ids.filter(id => inc[id] === 0)
  const inDegree = { ...inc }
  let head = 0
  while (head < queue.length) {
    const id = queue[head++]
    const r = topoRank[id] ?? 0
    out[id].forEach(to => {
      topoRank[to] = Math.max(topoRank[to] ?? 0, r + 1)
      inDegree[to]--
      if (inDegree[to] === 0) queue.push(to)
    })
  }
  ids.forEach(id => { if (topoRank[id] === undefined) topoRank[id] = 0 })

  // --- Step 2: Blend topological rank with semantic tier ---
  // Final rank = semantic tier * 10 + topo offset within that tier
  // This keeps clients above gateways above services above databases
  // regardless of edge direction, while still respecting connectivity.
  const maxTopoRank = Math.max(...Object.values(topoRank), 0)
  const topoNorm = maxTopoRank > 0 ? topoRank : {}  // skip blend if all rank 0

  const finalRank = {}
  ids.forEach(id => {
    const node = nodeMap[id]
    const tier = tierOf(node)
    const topo = (topoNorm[id] ?? 0) / Math.max(maxTopoRank, 1)  // 0..1
    // Tier dominates (×10), topo breaks ties within tier (×0.5)
    finalRank[id] = tier * 10 + topo * 0.5
  })

  // Discretize into integer layers by sorting and grouping close values
  const sorted = [...ids].sort((a, b) => finalRank[a] - finalRank[b])
  const layerOf = {}
  let currentLayer = 0
  let prevRank = null
  sorted.forEach(id => {
    if (prevRank !== null && finalRank[id] - prevRank > 1.5) currentLayer++
    layerOf[id] = currentLayer
    prevRank = finalRank[id]
  })

  // Group by layer
  const layers = {}
  ids.forEach(id => {
    const l = layerOf[id]
    if (!layers[l]) layers[l] = []
    layers[l].push(id)
  })
  const sortedLayers = Object.keys(layers).map(Number).sort((a, b) => a - b)

  // --- Step 3: Barycenter ordering within each layer (5 passes) ---
  for (let pass = 0; pass < 5; pass++) {
    // Top-down
    sortedLayers.forEach((l, li) => {
      if (li === 0) return
      const prevLayer = layers[sortedLayers[li - 1]]
      const prevPos = Object.fromEntries(prevLayer.map((id, i) => [id, i]))
      layers[l].sort((a, b) => {
        const aParents = edges.filter(e => e.to === a && prevPos[e.from] !== undefined).map(e => prevPos[e.from])
        const bParents = edges.filter(e => e.to === b && prevPos[e.from] !== undefined).map(e => prevPos[e.from])
        const aBar = aParents.length ? aParents.reduce((s, v) => s + v, 0) / aParents.length : 999
        const bBar = bParents.length ? bParents.reduce((s, v) => s + v, 0) / bParents.length : 999
        return aBar - bBar
      })
    })
    // Bottom-up
    for (let li = sortedLayers.length - 2; li >= 0; li--) {
      const l = sortedLayers[li]
      const nextLayer = layers[sortedLayers[li + 1]]
      const nextPos = Object.fromEntries(nextLayer.map((id, i) => [id, i]))
      layers[l].sort((a, b) => {
        const aChildren = edges.filter(e => e.from === a && nextPos[e.to] !== undefined).map(e => nextPos[e.to])
        const bChildren = edges.filter(e => e.from === b && nextPos[e.to] !== undefined).map(e => nextPos[e.to])
        const aBar = aChildren.length ? aChildren.reduce((s, v) => s + v, 0) / aChildren.length : 999
        const bBar = bChildren.length ? bChildren.reduce((s, v) => s + v, 0) / bChildren.length : 999
        return aBar - bBar
      })
    }
  }

  // --- Step 4: Assign x/y ---
  const positions = {}
  sortedLayers.forEach((l, li) => {
    const layer = layers[l]
    const totalW = layer.length * NODE_W + Math.max(0, layer.length - 1) * H_GAP
    const startX = PAD_X + Math.max(0, (900 - totalW) / 2)
    layer.forEach((id, ci) => {
      positions[id] = {
        x: startX + ci * (NODE_W + H_GAP),
        y: PAD_Y + li * (NODE_H + V_GAP),
      }
    })
  })

  // --- Step 5: Collision nudge (iterative) ---
  const placed = nodes.map(n => ({ ...n, ...positions[n.id] }))
  for (let iter = 0; iter < 20; iter++) {
    let moved = false
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i], b = placed[j]
        const overlapX = (NODE_W + H_GAP / 2) - Math.abs(a.x - b.x)
        const overlapY = (NODE_H + V_GAP / 2) - Math.abs(a.y - b.y)
        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            const push = overlapX / 2 + 4
            if (a.x <= b.x) { a.x -= push; b.x += push }
            else             { a.x += push; b.x -= push }
          } else {
            const push = overlapY / 2 + 4
            if (a.y <= b.y) { a.y -= push; b.y += push }
            else             { a.y += push; b.y -= push }
          }
          moved = true
        }
      }
    }
    if (!moved) break
  }

  placed.forEach(n => {
    n.x = Math.max(PAD_X, n.x)
    n.y = Math.max(PAD_Y, n.y)
  })

  return placed
}
