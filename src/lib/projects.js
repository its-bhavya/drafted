const STORAGE_KEY = 'sysvoice_projects'
const ACTIVE_KEY  = 'sysvoice_active'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function save(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function getProjects() {
  return load()
}

export function getActiveId() {
  return localStorage.getItem(ACTIVE_KEY) || null
}

export function setActiveId(id) {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function createProject(name) {
  const projects = load()
  const id = Date.now().toString()
  const project = {
    id,
    name: name || 'Untitled project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    diagram: { nodes: [], edges: [], nextId: 1 },
  }
  projects.unshift(project)
  save(projects)
  return project
}

export function updateProject(id, diagram) {
  const projects = load()
  const idx = projects.findIndex(p => p.id === id)
  if (idx === -1) return
  projects[idx] = { ...projects[idx], diagram, updatedAt: Date.now() }
  save(projects)
}

export function renameProject(id, name) {
  const projects = load()
  const idx = projects.findIndex(p => p.id === id)
  if (idx === -1) return
  projects[idx] = { ...projects[idx], name, updatedAt: Date.now() }
  save(projects)
}

export function deleteProject(id) {
  const projects = load().filter(p => p.id !== id)
  save(projects)
}
