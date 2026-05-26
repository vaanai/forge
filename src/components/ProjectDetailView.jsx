import { useState, useEffect } from 'react'
import { uid } from '../utils/storage.js'
import { getLabels } from '../utils/copy.js'
import { getProjectMetrics, formatDueLabel, getNotebookPreview, touchProject } from '../utils/projects.js'
import { Icons } from './Icons.jsx'
import ProjectNotesWorkspace from './ProjectNotesWorkspace.jsx'
import ConfirmSheet from './ConfirmSheet.jsx'

function EditProjectSheet({ project, onClose, onSave }) {
  const [name, setName] = useState(project.name)
  const [tag, setTag] = useState(project.tag || '')
  const [description, setDescription] = useState(project.description || '')
  const [dueDate, setDueDate] = useState(project.dueDate || '')

  function submit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({
      ...project,
      name: trimmed,
      tag: tag.trim(),
      description: description.trim(),
      dueDate: dueDate || null,
      lastTouchedAt: Date.now(),
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">Edit Project</h2>
        <form onSubmit={submit}>
          <input className="sheet-input" placeholder="Project name" value={name} onChange={e => setName(e.target.value)} autoFocus required />
          <input className="sheet-input" placeholder="Label / tag (optional)" value={tag} onChange={e => setTag(e.target.value)} style={{ marginTop: 10 }} />
          <textarea
            className="sheet-input sheet-textarea"
            placeholder="What are you building or working toward?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{ marginTop: 10, resize: 'vertical' }}
          />
          <label className="sheet-field-label">Project deadline (optional)</label>
          <input type="date" className="sheet-input" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ marginTop: 6 }} />
          <button className="sheet-btn" type="submit">Save changes</button>
        </form>
      </div>
    </div>
  )
}

function SendToTodaySheet({ task, labels, onClose, onCopy, onMove }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">{labels.sendToTodayTitle}</h2>
        <p className="confirm-sheet__message">&ldquo;{task.text}&rdquo;</p>
        <div className="confirm-sheet__actions" style={{ flexDirection: 'column' }}>
          <button type="button" className="sheet-btn" onClick={onCopy}>{labels.sendToTodayCopy}</button>
          <button type="button" className="sheet-btn secondary-btn" onClick={onMove}>{labels.sendToTodayMove}</button>
          <button type="button" className="sheet-btn secondary-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function MetricChip({ label, value, accent }) {
  return (
    <div className={`project-metric-chip ${accent ? `project-metric-chip--${accent}` : ''}`}>
      <span className="project-metric-chip__value">{value}</span>
      <span className="project-metric-chip__label">{label}</span>
    </div>
  )
}

export default function ProjectDetailView({
  project,
  onBack,
  onUpdate,
  onDelete,
  onSendToToday,
  plainLanguage = false,
  initialOpenNotes = false,
  highlightTaskId = null,
}) {
  const labels = getLabels(plainLanguage)
  const [taskInput, setTaskInput] = useState('')
  const [showNotes, setShowNotes] = useState(initialOpenNotes)
  const [showEdit, setShowEdit] = useState(false)
  const [descDraft, setDescDraft] = useState(project.description || '')
  const [confirmAction, setConfirmAction] = useState(null)
  const [sendToTodayTask, setSendToTodayTask] = useState(null)
  const [statusToast, setStatusToast] = useState(null)
  const [activeHighlight, setActiveHighlight] = useState(null)

  useEffect(() => {
    if (initialOpenNotes) setShowNotes(true)
  }, [initialOpenNotes])

  useEffect(() => {
    if (!highlightTaskId) return
    setActiveHighlight(highlightTaskId)
    requestAnimationFrame(() => {
      document.getElementById(`project-task-${highlightTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const t = setTimeout(() => setActiveHighlight(null), 2500)
    return () => clearTimeout(t)
  }, [highlightTaskId])

  useEffect(() => {
    setDescDraft(project.description || '')
  }, [project.description, project.id])

  const metrics = getProjectMetrics(project)
  const projectDueLabel = formatDueLabel(project.dueDate)

  function update(next) {
    onUpdate(touchProject(next))
  }

  function showToast(msg) {
    setStatusToast(msg)
    setTimeout(() => setStatusToast(null), 3500)
  }

  function addTask(e) {
    e.preventDefault()
    const text = taskInput.trim()
    if (!text) return
    update({
      ...project,
      tasks: [{ id: uid(), text, done: false, dueDate: null }, ...(project.tasks || [])],
    })
    setTaskInput('')
  }

  function toggleTask(taskId) {
    update({
      ...project,
      tasks: project.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
    })
  }

  function deleteTask(taskId) {
    update({ ...project, tasks: project.tasks.filter(t => t.id !== taskId) })
  }

  function setTaskDueDate(taskId, dueDate) {
    update({
      ...project,
      tasks: project.tasks.map(t => t.id === taskId ? { ...t, dueDate: dueDate || null } : t),
    })
  }

  function saveDescription() {
    if (descDraft.trim() === (project.description || '')) return
    update({ ...project, description: descDraft.trim() })
  }

  function deleteIdea(ideaId) {
    update({ ...project, ideas: (project.ideas || []).filter(i => i.id !== ideaId) })
  }

  function toggleArchive() {
    const nextArchived = !project.archived
    update({ ...project, archived: nextArchived })
    if (nextArchived) {
      showToast(`${labels.projectArchived}. ${labels.projectArchiveHint}`)
    }
  }

  function handleSendCopy() {
    if (!sendToTodayTask || !onSendToToday) return
    onSendToToday(sendToTodayTask.text)
    setSendToTodayTask(null)
  }

  function handleSendMove() {
    if (!sendToTodayTask || !onSendToToday) return
    onSendToToday(sendToTodayTask.text)
    deleteTask(sendToTodayTask.id)
    setSendToTodayTask(null)
  }

  if (showNotes) {
    return (
      <ProjectNotesWorkspace
        project={project}
        onBack={() => setShowNotes(false)}
        onUpdate={update}
        plainLanguage={plainLanguage}
      />
    )
  }

  return (
    <div className="project-detail-screen">
      <header className="project-detail-screen__header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to projects">
          <Icons.ChevronLeft />
        </button>
        <div className="project-detail-screen__title-wrap">
          <h1 className="project-detail-screen__title">{project.name}</h1>
          <p className="project-detail-screen__meta">
            {metrics.total === 0 ? 'No tasks yet' : `${metrics.done} / ${metrics.total} done · ${metrics.progress}%`}
            {project.tag ? <span className="tag tag--gold" style={{ marginLeft: 8 }}>{project.tag}</span> : null}
            {projectDueLabel && (
              <span className={`tag ${metrics.projectOverdue ? 'tag--danger' : 'tag--muted'}`} style={{ marginLeft: 8 }}>
                {projectDueLabel}
              </span>
            )}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={() => setShowEdit(true)} aria-label="Edit project">
          <Icons.Edit size={16} />
        </button>
      </header>

      <div className="project-detail-screen__body">
        <div className="project-metrics-row">
          <MetricChip label="Progress" value={`${metrics.progress}%`} accent={metrics.progress === 100 ? 'success' : undefined} />
          <MetricChip
            label="Last active"
            value={metrics.daysSinceTouch === 0 ? 'Today' : `${metrics.daysSinceTouch}d ago`}
            accent={metrics.daysSinceTouch > 7 ? 'warn' : undefined}
          />
          <MetricChip label="Pages" value={metrics.noteCount} />
          {metrics.overdueTasks > 0 && (
            <MetricChip label="Overdue" value={metrics.overdueTasks} accent="danger" />
          )}
        </div>

        <section className="project-section">
          <h2 className="project-section__label">What I&apos;m building</h2>
          <textarea
            className="project-description-input"
            value={descDraft}
            onChange={e => setDescDraft(e.target.value)}
            onBlur={saveDescription}
            placeholder="Describe your goal, vision, or what success looks like..."
            rows={2}
          />
        </section>

        <section className="project-section">
          <h2 className="project-section__label">Next up</h2>
          <form onSubmit={addTask}>
            <div className="input-bar" style={{ margin: '0 0 10px' }}>
              <input
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                placeholder="Add a task..."
                autoComplete="off"
              />
              <button className="add-btn" type="submit" aria-label="Add task"><Icons.Plus /></button>
            </div>
          </form>
          {(project.tasks || []).length === 0 ? (
            <p className="project-section__empty">No tasks yet. Add your first step above.</p>
          ) : (
            <div className="project-detail-task-list">
              {(project.tasks || []).map(task => (
                <div
                  key={task.id}
                  id={`project-task-${task.id}`}
                  className={`task-item ${task.done ? 'completed' : ''} ${activeHighlight === task.id ? 'search-highlight' : ''}`}
                >
                  <button
                    className={`task-check ${task.done ? 'checked' : ''}`}
                    onClick={() => toggleTask(task.id)}
                    aria-label="Toggle task"
                  >
                    <Icons.Check />
                  </button>
                  <div className="project-task-body">
                    <span className="task-text">{task.text}</span>
                    {!task.done && (
                      <div className="project-task-due">
                        <input
                          type="date"
                          className="project-task-due-input"
                          value={task.dueDate || ''}
                          onChange={e => setTaskDueDate(task.id, e.target.value)}
                          aria-label="Task due date"
                        />
                        {task.dueDate && formatDueLabel(task.dueDate) && (
                          <span className={`project-task-due-label ${task.dueDate < new Date().toISOString().slice(0, 10) ? 'overdue' : ''}`}>
                            {formatDueLabel(task.dueDate)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="task-actions">
                    {!task.done && onSendToToday && (
                      <button
                        className="task-action-icon-btn route-btn"
                        onClick={() => setSendToTodayTask(task)}
                        title="Add to Today"
                        aria-label="Send to today"
                      >
                        <Icons.TodayArrow size={13} />
                      </button>
                    )}
                    <button className="task-action-icon-btn delete-btn" onClick={() => deleteTask(task.id)} aria-label="Delete task">
                      <Icons.X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="project-section">
          <div className="project-section__header-row">
            <h2 className="project-section__label" style={{ margin: 0 }}>Notes</h2>
            <span className="project-section__hint">{metrics.noteCount} {metrics.noteCount === 1 ? 'page' : 'pages'}</span>
          </div>
          <button type="button" className="project-notes-preview" onClick={() => setShowNotes(true)}>
            <div className="project-notes-preview__icon">📓</div>
            <div className="project-notes-preview__text">
              <span className="project-notes-preview__title">Open notebook</span>
              <span className="project-notes-preview__snippet">
                {getNotebookPreview(project) || 'Tap to write notes, specs, links, and checklists for this project.'}
              </span>
            </div>
            <Icons.ChevronRight size={16} />
          </button>
        </section>

        {(project.ideas || []).length > 0 && (
          <section className="project-section">
            <h2 className="project-section__label">{labels.sparks} captured</h2>
            <div className="project-ideas-list">
              {(project.ideas || []).map(idea => (
                <div key={idea.id} className="project-idea-item">
                  <span className="project-idea-item__text">{idea.text}</span>
                  <button type="button" className="task-action-icon-btn delete-btn" onClick={() => deleteIdea(idea.id)} aria-label="Remove idea">
                    <Icons.X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="project-card-actions">
          <button type="button" className="project-action-btn" onClick={() => update({ ...project, pinned: !project.pinned })}>
            {project.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button type="button" className="project-action-btn" onClick={toggleArchive}>
            {project.archived ? 'Restore' : 'Archive'}
          </button>
        </div>

        <button type="button" className="project-delete-btn" onClick={() => setConfirmAction({ type: 'deleteProject' })}>
          <Icons.Trash /> Delete project
        </button>
      </div>

      {showEdit && (
        <EditProjectSheet
          project={project}
          onClose={() => setShowEdit(false)}
          onSave={update}
        />
      )}

      {sendToTodayTask && (
        <SendToTodaySheet
          task={sendToTodayTask}
          labels={labels}
          onClose={() => setSendToTodayTask(null)}
          onCopy={handleSendCopy}
          onMove={handleSendMove}
        />
      )}

      {confirmAction?.type === 'deleteProject' && (
        <ConfirmSheet
          title={labels.deleteProjectTitle}
          message={labels.deleteProjectMessage}
          confirmLabel="Delete project"
          danger
          onConfirm={() => { onDelete(project.id); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {statusToast && (
        <div className="share-toast">{statusToast}</div>
      )}
    </div>
  )
}
