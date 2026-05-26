import { useState, useEffect } from 'react'
import { getLabels } from '../utils/copy.js'
import { normalizeProject, createProject, getProjectMetrics, formatDueLabel } from '../utils/projects.js'
import { Icons } from './Icons.jsx'
import ProjectDetailView from './ProjectDetailView.jsx'

function ProjectListCard({ project, onOpen }) {
  const metrics = getProjectMetrics(project)
  const dueLabel = formatDueLabel(project.dueDate)

  return (
    <button type="button" className={`project-list-card ${project.pinned ? 'project-list-card--pinned' : ''}`} onClick={() => onOpen(project.id)}>
      <div className="project-list-card__main">
        <div className="project-list-card__name">
          {project.pinned && <span className="project-pin-badge" title="Pinned"><Icons.Pin size={12} /></span>}
          {project.name}
        </div>
        <div className="project-list-card__meta">
          {metrics.total === 0 ? 'No tasks' : `${metrics.done} / ${metrics.total} done · ${metrics.progress}%`}
          {project.tag ? <span className="tag tag--gold" style={{ marginLeft: 8 }}>{project.tag}</span> : null}
          {dueLabel && (
            <span className={`tag ${metrics.projectOverdue ? 'tag--danger' : 'tag--muted'}`} style={{ marginLeft: 8 }}>
              {dueLabel}
            </span>
          )}
        </div>
        {project.description?.trim() && (
          <p className="project-list-card__desc">{project.description.trim().slice(0, 60)}{project.description.length > 60 ? '…' : ''}</p>
        )}
      </div>
      <Icons.ChevronRight size={16} />
    </button>
  )
}

function NewProjectSheet({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

  function submit(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const project = createProject({ name: n, tag })
    onCreate({
      ...project,
      description: description.trim(),
      dueDate: dueDate || null,
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">New Project</h2>
        <form onSubmit={submit}>
          <input className="sheet-input" placeholder="Project name (e.g. Spice Rack, Portfolio Site)" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <input className="sheet-input" placeholder="Label / tag (optional)" value={tag} onChange={e => setTag(e.target.value)} style={{ marginTop: 10 }} />
          <textarea
            className="sheet-input sheet-textarea"
            placeholder="What are you building? (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            style={{ marginTop: 10, resize: 'vertical' }}
          />
          <label className="sheet-field-label">Deadline (optional)</label>
          <input type="date" className="sheet-input" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ marginTop: 6 }} />
          <button className="sheet-btn" type="submit">Create Project</button>
        </form>
      </div>
    </div>
  )
}

export default function ProjectsView({
  projects = [],
  onUpdateProjects,
  onSendToToday,
  plainLanguage = false,
  navTarget = null,
  onNavConsumed,
}) {
  const [showSheet, setShowSheet] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [openProjectId, setOpenProjectId] = useState(null)
  const [openNotes, setOpenNotes] = useState(false)
  const [highlightTaskId, setHighlightTaskId] = useState(null)
  const labels = getLabels(plainLanguage)

  const normalized = projects.map(normalizeProject)
  const active = normalized.filter(p => !p.archived)
  const archived = normalized.filter(p => p.archived)
  const sortedActive = [...active].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  const openProject = normalized.find(p => p.id === openProjectId)

  useEffect(() => {
    if (!navTarget?.projectId) return
    setOpenProjectId(navTarget.projectId)
    setOpenNotes(!!navTarget.openNotes)
    setHighlightTaskId(navTarget.taskId || null)
    onNavConsumed?.()
  }, [navTarget, onNavConsumed])

  function createProjectEntry(p) {
    onUpdateProjects([normalizeProject(p), ...projects.map(normalizeProject)])
  }

  function updateProject(updated) {
    onUpdateProjects(projects.map(p => p.id === updated.id ? normalizeProject(updated) : normalizeProject(p)))
  }

  function deleteProject(id) {
    onUpdateProjects(projects.filter(p => p.id !== id))
    setOpenProjectId(null)
    setOpenNotes(false)
  }

  if (openProject) {
    return (
      <ProjectDetailView
        project={openProject}
        onBack={() => { setOpenProjectId(null); setOpenNotes(false) }}
        onUpdate={updateProject}
        onDelete={deleteProject}
        onSendToToday={onSendToToday}
        plainLanguage={plainLanguage}
        initialOpenNotes={openNotes}
        highlightTaskId={highlightTaskId}
      />
    )
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
          <ProjectListCard key={p.id} project={p} onOpen={setOpenProjectId} />
        ))}
      </div>

      {archived.length > 0 && (
        <div style={{ padding: '0 20px 16px' }}>
          <button type="button" className="archived-toggle" onClick={() => setShowArchived(s => !s)}>
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived && (
            <div className="project-grid" style={{ marginTop: 12, opacity: 0.85 }}>
              {archived.map(p => (
                <ProjectListCard key={p.id} project={p} onOpen={setOpenProjectId} />
              ))}
            </div>
          )}
        </div>
      )}

      <button className="new-project-btn" onClick={() => setShowSheet(true)} id="new-project-btn">
        <Icons.Plus size={18} /> New project
      </button>

      {showSheet && <NewProjectSheet onClose={() => setShowSheet(false)} onCreate={createProjectEntry} />}
    </div>
  )
}
