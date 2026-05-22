import { useState } from 'react'
import { uid } from '../utils/storage.js'
import { getLabels } from '../utils/copy.js'
import { Icons } from './Icons.jsx'
import ProjectDetailView from './ProjectDetailView.jsx'

function ProjectListCard({ project, onOpen }) {
  const doneCount = (project.tasks || []).filter(t => t.done).length
  const totalCount = (project.tasks || []).length

  return (
    <button type="button" className={`project-list-card ${project.pinned ? 'project-list-card--pinned' : ''}`} onClick={() => onOpen(project.id)}>
      <div className="project-list-card__main">
        <div className="project-list-card__name">
          {project.pinned && <span className="project-pin-badge" title="Pinned"><Icons.Pin size={12} /></span>}
          {project.name}
        </div>
        <div className="project-list-card__meta">
          {totalCount === 0 ? 'No tasks' : `${doneCount} / ${totalCount} done`}
          {project.tag ? <span className="tag tag--gold" style={{ marginLeft: 8 }}>{project.tag}</span> : null}
        </div>
      </div>
      <Icons.ChevronRight size={16} />
    </button>
  )
}

function NewProjectSheet({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')

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
          <input className="sheet-input" placeholder="Project name (e.g. Spice Rack, Portfolio Site)" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <input className="sheet-input" placeholder="Label / tag (optional)" value={tag} onChange={e => setTag(e.target.value)} style={{ marginTop: 10 }} />
          <button className="sheet-btn" type="submit">Create Project</button>
        </form>
      </div>
    </div>
  )
}

export default function ProjectsView({ projects = [], onUpdateProjects, onSendToToday, plainLanguage = false }) {
  const [showSheet, setShowSheet] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [openProjectId, setOpenProjectId] = useState(null)
  const labels = getLabels(plainLanguage)

  const active = projects.filter(p => !p.archived)
  const archived = projects.filter(p => p.archived)
  const sortedActive = [...active].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  const openProject = projects.find(p => p.id === openProjectId)

  function createProject(p) {
    onUpdateProjects([p, ...projects])
  }

  function updateProject(updated) {
    onUpdateProjects(projects.map(p => p.id === updated.id ? updated : p))
  }

  function deleteProject(id) {
    onUpdateProjects(projects.filter(p => p.id !== id))
    setOpenProjectId(null)
  }

  if (openProject) {
    return (
      <ProjectDetailView
        project={openProject}
        onBack={() => setOpenProjectId(null)}
        onUpdate={updateProject}
        onDelete={deleteProject}
        onSendToToday={onSendToToday}
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

      {showSheet && <NewProjectSheet onClose={() => setShowSheet(false)} onCreate={createProject} />}
    </div>
  )
}
