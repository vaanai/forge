import { useState, useEffect } from 'react'
import { storage, uid } from '../utils/storage.js'
import { Icons } from './Icons.jsx'

// ── Project task list ──────────────────────────────────────
function ProjectTaskList({ project, onUpdate }) {
  const [input, setInput] = useState('')

  function addTask(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    const updated = { ...project, tasks: [{ id: uid(), text, done: false }, ...(project.tasks || [])] }
    onUpdate(updated)
    setInput('')
  }

  function toggleTask(taskId) {
    const updated = {
      ...project,
      tasks: project.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
    }
    onUpdate(updated)
  }

  function deleteTask(taskId) {
    const updated = { ...project, tasks: project.tasks.filter(t => t.id !== taskId) }
    onUpdate(updated)
  }

  return (
    <div>
      <form onSubmit={addTask}>
        <div className="input-bar" style={{ margin: '0 0 10px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add a task..."
            autoComplete="off"
            id={`project-task-input-${project.id}`}
          />
          <button className="add-btn" type="submit" aria-label="Add task"><Icons.Plus /></button>
        </div>
      </form>
      {(project.tasks || []).length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>No tasks yet.</p>
      ) : (
        <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {(project.tasks || []).map(task => (
            <div key={task.id} className={`task-item ${task.done ? 'completed' : ''}`} style={{ background: 'var(--bg-base)' }}>
              <button
                className={`task-check ${task.done ? 'checked' : ''}`}
                onClick={() => toggleTask(task.id)}
                aria-label="Toggle task"
              >
                <Icons.Check />
              </button>
              <span className="task-text">{task.text}</span>
              <button className="task-delete" onClick={() => deleteTask(task.id)} aria-label="Delete">
                <Icons.X />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Single Project Card ────────────────────────────────────
function ProjectCard({ project, onUpdate, onDelete }) {
  const [open, setOpen]     = useState(false)
  const [tab, setTab]       = useState('tasks')
  const [scratch, setScratch] = useState(project.scratchpad || '')

  // save scratchpad on blur
  function saveScratch() {
    onUpdate({ ...project, scratchpad: scratch })
  }

  const doneCount  = (project.tasks || []).filter(t => t.done).length
  const totalCount = (project.tasks || []).length

  return (
    <div className="project-card">
      <div
        className="project-card__header"
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-expanded={open}
        id={`project-header-${project.id}`}
      >
        <div>
          <div className="project-card__name">{project.name}</div>
          <div className="project-card__meta">
            {totalCount === 0 ? 'No tasks' : `${doneCount} / ${totalCount} done`}
            {project.tag ? <span className="tag tag--gold" style={{ marginLeft: 8 }}>{project.tag}</span> : null}
          </div>
        </div>
        <span className={`project-card__chevron ${open ? 'open' : ''}`}>
          <Icons.ChevronDown />
        </span>
      </div>

      <div className={`project-card__body ${open ? 'open' : ''}`}>
        <div className="project-card__body-inner">
          {/* Tab switcher */}
          <div className="project-tabs">
            <button
              className={`project-tab ${tab === 'tasks' ? 'active' : ''}`}
              onClick={() => setTab('tasks')}
              id={`project-tab-tasks-${project.id}`}
            >
              Tasks
            </button>
            <button
              className={`project-tab ${tab === 'scratch' ? 'active' : ''}`}
              onClick={() => setTab('scratch')}
              id={`project-tab-scratch-${project.id}`}
            >
              Scratchpad
            </button>
          </div>

          {tab === 'tasks' && (
            <ProjectTaskList project={project} onUpdate={onUpdate} />
          )}

          {tab === 'scratch' && (
            <textarea
              className="scratchpad"
              value={scratch}
              onChange={e => setScratch(e.target.value)}
              onBlur={saveScratch}
              placeholder="Dump raw thoughts, dimensions, links, code snippets, anything..."
              id={`project-scratch-${project.id}`}
            />
          )}

          <button className="project-delete-btn" onClick={() => onDelete(project.id)}>
            <Icons.Trash /> Delete project
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Project Sheet ──────────────────────────────────────
function NewProjectSheet({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [tag, setTag]   = useState('')

  function submit(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    onCreate({ id: uid(), name: n, tag: tag.trim(), tasks: [], scratchpad: '' })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">New Project</h2>
        <form onSubmit={submit}>
          <input
            className="sheet-input"
            placeholder="Project name (e.g. Spice Rack, Portfolio Site)"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            id="new-project-name"
          />
          <input
            className="sheet-input"
            placeholder="Label / tag (optional — e.g. woodworking, dev)"
            value={tag}
            onChange={e => setTag(e.target.value)}
            style={{ marginTop: 10 }}
            id="new-project-tag"
          />
          <button className="sheet-btn" type="submit">Create Project</button>
        </form>
      </div>
    </div>
  )
}

// ── Projects View ──────────────────────────────────────────
export default function ProjectsView() {
  const [projects, setProjects] = useState(() => storage.getProjects())
  const [showSheet, setShowSheet] = useState(false)

  useEffect(() => { storage.saveProjects(projects) }, [projects])

  function createProject(p) {
    setProjects(prev => [p, ...prev])
  }

  function updateProject(updated) {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  function deleteProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Projects</h1>
        <p className="section-subtitle">Your active labs — code, woodworking, and beyond.</p>
      </div>

      {projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon"><Icons.Projects /></div>
          <p className="empty-state__label">No projects yet. Create your first workspace below.</p>
        </div>
      )}

      <div className="project-grid">
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} onUpdate={updateProject} onDelete={deleteProject} />
        ))}
      </div>

      <button
        className="new-project-btn"
        onClick={() => setShowSheet(true)}
        id="new-project-btn"
      >
        <Icons.Plus size={18} /> New project
      </button>

      {showSheet && (
        <NewProjectSheet onClose={() => setShowSheet(false)} onCreate={createProject} />
      )}
    </div>
  )
}
