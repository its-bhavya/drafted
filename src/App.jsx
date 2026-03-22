import { useState, useEffect, useCallback } from 'react'
import { useDiagram } from './hooks/useDiagram'
import DiagramCanvas from './components/DiagramCanvas'
import Toolbar from './components/Toolbar'
import InputBar from './components/InputBar'
import Sidebar from './components/Sidebar'
import {
  getProjects, getActiveId, setActiveId,
  createProject, updateProject, renameProject, deleteProject,
} from './lib/projects'
import styles from './App.module.css'

export default function App() {
  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Projects
  const [projects, setProjects]     = useState(() => getProjects())
  const [activeId, setActiveIdState] = useState(() => {
    const id = getActiveId()
    const all = getProjects()
    if (all.find(p => p.id === id)) return id
    if (all.length > 0) return all[0].id
    // Auto-create first project
    const p = createProject('My first project')
    return p.id
  })

  const activeProject = projects.find(p => p.id === activeId)

  const { diagram, status, process, undo, clear, reset, updateNodePosition, setDiagram, canUndo } =
    useDiagram(activeProject?.diagram)

  // Save diagram to project whenever it changes
  useEffect(() => {
    if (!activeId || !diagram) return
    updateProject(activeId, diagram)
    setProjects(getProjects())
  }, [diagram, activeId])

  const handleSelect = useCallback((id) => {
    // Save current before switching
    if (activeId) updateProject(activeId, diagram)
    setActiveId(id)
    setActiveIdState(id)
    const p = getProjects().find(x => x.id === id)
    reset(p?.diagram)
    setProjects(getProjects())
  }, [activeId, diagram, reset])

  const handleCreate = useCallback((name) => {
    const p = createProject(name)
    setProjects(getProjects())
    handleSelect(p.id)
  }, [handleSelect])

  const handleRename = useCallback((id, name) => {
    renameProject(id, name)
    setProjects(getProjects())
  }, [])

  const handleDelete = useCallback((id) => {
    deleteProject(id)
    const remaining = getProjects()
    setProjects(remaining)
    if (id === activeId) {
      if (remaining.length > 0) {
        handleSelect(remaining[0].id)
      } else {
        const p = createProject('My first project')
        setProjects(getProjects())
        handleSelect(p.id)
      }
    }
  }, [activeId, handleSelect])

  return (
    <div className={styles.app} data-theme={theme}>
      <Toolbar
        projectName={activeProject?.name}
        diagram={diagram}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        canUndo={canUndo}
        onUndo={undo}
        onClear={clear}
      />

      <div className={styles.body}>
        <Sidebar
          projects={projects}
          activeId={activeId}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        <main className={styles.main}>
          <DiagramCanvas diagram={diagram} theme={theme} onNodeMove={updateNodePosition} onDiagramChange={setDiagram} />
        </main>
      </div>

      <InputBar onSubmit={process} status={status} />
    </div>
  )
}
