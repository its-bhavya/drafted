const NODE_W = 160
const NODE_H = 60
const PAD    = 40

const TYPE_COLORS = {
  service:  { border: '#4f70f5', bg: 'rgba(79,112,245,0.15)',  label: '#93b4ff' },
  database: { border: '#22c7a0', bg: 'rgba(34,199,160,0.15)',  label: '#6ee7c7' },
  queue:    { border: '#d97706', bg: 'rgba(217,119,6,0.15)',   label: '#fbbf24' },
  client:   { border: '#9b7df8', bg: 'rgba(155,125,248,0.15)', label: '#c4b5fd' },
  gateway:  { border: '#e5607a', bg: 'rgba(229,96,122,0.15)',  label: '#fda4b8' },
}

function buildSVGString(diagram, theme) {
  const { nodes, edges } = diagram
  if (nodes.length === 0) return null

  const bgColor  = theme === 'light' ? '#ffffff' : '#09090b'
  const textColor = theme === 'light' ? '#1a1a1a' : '#f0f0f2'
  const subColor  = theme === 'light' ? '#666'    : 'rgba(255,255,255,0.4)'
  const edgeColor = theme === 'light' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'

  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y)
  const minX = Math.min(...xs) - PAD
  const minY = Math.min(...ys) - PAD
  const maxX = Math.max(...xs) + NODE_W + PAD
  const maxY = Math.max(...ys) + NODE_H + PAD
  const W = maxX - minX
  const H = maxY - minY

  // shift all coords so minX/minY = 0
  const tx = n => n.x - minX
  const ty = n => n.y - minY

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n`
  svg += `<rect width="${W}" height="${H}" fill="${bgColor}"/>\n`
  svg += `<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="${edgeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>\n`

  // edges
  edges.forEach(e => {
    const fn = nodes.find(n => n.id === e.from)
    const tn = nodes.find(n => n.id === e.to)
    if (!fn || !tn) return
    const x1 = tx(fn) + NODE_W / 2, y1 = ty(fn) + NODE_H / 2
    const x2 = tx(tn) + NODE_W / 2, y2 = ty(tn) + NODE_H / 2
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${edgeColor}" stroke-width="1.5" marker-end="url(#arr)"/>\n`
    if (e.label) {
      svg += `<text x="${(x1+x2)/2}" y="${(y1+y2)/2 - 8}" text-anchor="middle" font-size="11" font-family="monospace" fill="${subColor}">${e.label}</text>\n`
    }
  })

  // nodes
  nodes.forEach(n => {
    const s = TYPE_COLORS[n.type] || TYPE_COLORS.service
    const x = tx(n), y = ty(n)
    svg += `<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="10" fill="${s.bg}" stroke="${s.border}" stroke-width="1"/>\n`
    svg += `<text x="${x + NODE_W/2}" y="${y + (n.sub ? 22 : NODE_H/2 + 5)}" text-anchor="middle" font-size="13" font-weight="600" font-family="sans-serif" fill="${s.label}">${n.label}</text>\n`
    if (n.sub) {
      svg += `<text x="${x + NODE_W/2}" y="${y + 40}" text-anchor="middle" font-size="10" font-family="monospace" fill="${subColor}">${n.sub}</text>\n`
    }
  })

  svg += `</svg>`
  return svg
}

export function exportSVG(diagram, theme = 'dark') {
  const svgStr = buildSVGString(diagram, theme)
  if (!svgStr) return
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  download(blob, 'diagram.svg')
}

export async function exportPNG(diagram, theme = 'dark') {
  const svgStr = buildSVGString(diagram, theme)
  if (!svgStr) return
  const blob = await svgToRasterBlob(svgStr, 'image/png', 2)
  download(blob, 'diagram.png')
}

export async function exportJPEG(diagram, theme = 'dark') {
  const svgStr = buildSVGString(diagram, theme)
  if (!svgStr) return
  const blob = await svgToRasterBlob(svgStr, 'image/jpeg', 2)
  download(blob, 'diagram.jpg')
}

function svgToRasterBlob(svgStr, mimeType, scale = 2) {
  return new Promise((resolve, reject) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgStr, 'image/svg+xml')
    const svgEl = doc.documentElement
    const W = parseFloat(svgEl.getAttribute('width'))
    const H = parseFloat(svgEl.getAttribute('height'))

    const canvas = document.createElement('canvas')
    canvas.width  = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)

    const img = new Image()
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }))
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(resolve, mimeType, 0.95)
    }
    img.onerror = reject
    img.src = url
  })
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
