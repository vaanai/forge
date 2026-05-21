import { useState, useEffect } from 'react'
import { uid } from '../utils/storage.js'
import { getLabels } from '../utils/copy.js'
import { Icons } from './Icons.jsx'
import ScratchpadPreview from './ScratchpadPreview.jsx'

function ProjectTaskList({ project, onUpdate, onSendToToday }) {
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
            <div key={task.id} className={`task-item ${task.done ? 'completed' : ''}`}>
              <button
                className={`task-check ${task.done ? 'checked' : ''}`}
                onClick={() => toggleTask(task.id)}
                aria-label="Toggle task"
              >
                <Icons.Check />
              </button>
              <span className="task-text">{task.text}</span>
              <div className="task-actions">
                {!task.done && onSendToToday && (
                  <button
                    className="task-action-icon-btn route-btn"
                    onClick={() => onSendToToday(task.text)}
                    title="Add to Today"
                    aria-label="Send to today"
                  >
                    <Icons.TodayArrow size={13} />
                  </button>
                )}
                <button 
                  className="task-action-icon-btn delete-btn" 
                  onClick={() => deleteTask(task.id)} 
                  aria-label="Delete task"
                >
                  <Icons.X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, onUpdate, onDelete, onSendToToday, labels }) {
  const [open, setOpen]     = useState(false)
  const [tab, setTab]       = useState('tasks')
  const [scratchMode, setScratchMode] = useState('edit')
  const [scratch, setScratch] = useState(project.scratchpad || '')

  useEffect(() => {
    setScratch(project.scratchpad || '')
  }, [project.scratchpad])

  function saveScratch() {
    onUpdate({ ...project, scratchpad: scratch })
  }

  const doneCount  = (project.tasks || []).filter(t => t.done).length
  const totalCount = (project.tasks || []).length

  return (
    <div className={`project-card ${project.pinned ? 'project-card--pinned' : ''}`}>
      <div
        className="project-card__header"
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
        role="button"
        aria-expanded={open}
        tabIndex="0"
        id={`project-header-${project.id}`}
      >
        <div>
          <div className="project-card__name">
            {project.pinned && <span className="project-pin-badge" title="Pinned"><Icons.Pin size={12} /></span>}
            {project.name}
          </div>
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
            <ProjectTaskList project={project} onUpdate={onUpdate} onSendToToday={onSendToToday} />
          )}

          {tab === 'scratch' && (
            <>
              <div className="scratchpad-subtabs">
                <button
                  type="button"
                  className={`scratchpad-subtab ${scratchMode === 'edit' ? 'active' : ''}`}
                  onClick={() => setScratchMode('edit')}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`scratchpad-subtab ${scratchMode === 'preview' ? 'active' : ''}`}
                  onClick={() => setScratchMode('preview')}
                >
                  Preview
                </button>
              </div>
              {scratchMode === 'edit' ? (
                <>
                  <textarea
                    className="scratchpad"
                    value={scratch}
                    onChange={e => setScratch(e.target.value)}
                    onBlur={saveScratch}
                    placeholder="Dump raw thoughts, dimensions, links, code snippets, anything..."
                    id={`project-scratch-${project.id}`}
                  />
                  <p className="scratchpad-hint">
                    Use &quot;- [ ] item&quot; for checklists. Links become tappable in Preview.
                  </p>
                </>
              ) : (
                <ScratchpadPreview
                  text={scratch}
                  onChange={next => {
                    setScratch(next)
                    onUpdate({ ...project, scratchpad: next })
                  }}
                />
              )}
            </>
          )}

          <div className="project-card-actions">
            <button
              type="button"
              className="project-action-btn"
              onClick={() => onUpdate({ ...project, pinned: !project.pinned })}
            >
              {project.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              type="button"
              className="project-action-btn"
              onClick={() => onUpdate({ ...project, archived: !project.archived })}
            >
              {project.archived ? 'Restore' : 'Archive'}
            </button>
          </div>

          <button className="project-delete-btn" onClick={() => onDelete(project.id)}>
            <Icons.Trash /> Delete project
          </button>
        </div>
      </div>
    </div>
  )
}

function NewProjectSheet({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [tag, setTag]   = useState('')

  function submit(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    onCreate({ id: uid(), name: n, tag: tag.trim(), tasks: [], scratchpad: '', pinned: false, archived: false })
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

export default function ProjectsView({ projects = [], onUpdateProjects, onSendToToday, plainLanguage = false }) {
  const [showSheet, setShowSheet] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const labels = getLabels(plainLanguage)

  const active = projects.filter(p => !p.archived)
  const archived = projects.filter(p => p.archived)
  const sortedActive = [...active].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  function createProject(p) {
    onUpdateProjects([p, ...projects])
  }

  function updateProject(updated) {
    onUpdateProjects(projects.map(p => p.id === updated.id ? updated : p))
  }

  function deleteProject(id) {
    onUpdateProjects(projects.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Projects</h1>
        <p className="section-subtitle">{labels.projectsSubtitle}</p>
      </div>

      {sortedActive.length === 0 && archived.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon"><Icons.Projects /></div>
          <p className="empty-state__label">No projects yet. Create your first workspace below.</p>
        </div>
      )}

      <div className="project-grid">
        {sortedActive.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            onUpdate={updateProject}
            onDelete={deleteProject}
            onSendToToday={onSendToToday}
            labels={labels}
          />
        ))}
      </div>

      {archived.length > 0 && (
        <div style={{ padding: '0 20px 16px' }}>
          <button
            type="button"
            className="archived-toggle"
            onClick={() => setShowArchived(s => !s)}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived && (
            <div className="project-grid" style={{ marginTop: 12, opacity: 0.85 }}>
              {archived.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onUpdate={updateProject}
                  onDelete={deleteProject}
                  onSendToToday={onSendToToday}
                  labels={labels}
                />
              ))}
            </div>
          )}
        </div>
      )}

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
