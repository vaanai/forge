import { useState, useEffect } from 'react'
import { uid } from '../utils/storage.js'
import { Icons } from './Icons.jsx'
import ScratchpadPreview from './ScratchpadPreview.jsx'

function ProjectTaskList({ project, onUpdate, onSendToToday }) {
  const [input, setInput] = useState('')

  function addTask(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onUpdate({ ...project, tasks: [{ id: uid(), text, done: false }, ...(project.tasks || [])] })
    setInput('')
  }

  function toggleTask(taskId) {
    onUpdate({
      ...project,
      tasks: project.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
    })
  }

  function deleteTask(taskId) {
    onUpdate({ ...project, tasks: project.tasks.filter(t => t.id !== taskId) })
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
          />
          <button className="add-btn" type="submit" aria-label="Add task"><Icons.Plus /></button>
        </div>
      </form>
      {(project.tasks || []).length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>No tasks yet.</p>
      ) : (
        <div className="project-detail-task-list">
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
                <button className="task-action-icon-btn delete-btn" onClick={() => deleteTask(task.id)} aria-label="Delete task">
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

export default function ProjectDetailView({ project, onBack, onUpdate, onDelete, onSendToToday }) {
  const [tab, setTab] = useState('tasks')
  const [scratchMode, setScratchMode] = useState('edit')
  const [scratch, setScratch] = useState(project.scratchpad || '')

  useEffect(() => {
    setScratch(project.scratchpad || '')
  }, [project.scratchpad, project.id])

  function saveScratch() {
    onUpdate({ ...project, scratchpad: scratch })
  }

  const doneCount = (project.tasks || []).filter(t => t.done).length
  const totalCount = (project.tasks || []).length

  return (
    <div className="project-detail-screen">
      <header className="project-detail-screen__header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to projects">
          <Icons.ChevronLeft />
        </button>
        <div className="project-detail-screen__title-wrap">
          <h1 className="project-detail-screen__title">{project.name}</h1>
          <p className="project-detail-screen__meta">
            {totalCount === 0 ? 'No tasks' : `${doneCount} / ${totalCount} done`}
            {project.tag ? <span className="tag tag--gold" style={{ marginLeft: 8 }}>{project.tag}</span> : null}
          </p>
        </div>
      </header>

      <div className="project-detail-screen__body">
        <div className="project-tabs">
          <button type="button" className={`project-tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
            Tasks
          </button>
          <button type="button" className={`project-tab ${tab === 'scratch' ? 'active' : ''}`} onClick={() => setTab('scratch')}>
            Scratchpad
          </button>
        </div>

        {tab === 'tasks' && (
          <ProjectTaskList project={project} onUpdate={onUpdate} onSendToToday={onSendToToday} />
        )}

        {tab === 'scratch' && (
          <>
            <div className="scratchpad-subtabs">
              <button type="button" className={`scratchpad-subtab ${scratchMode === 'edit' ? 'active' : ''}`} onClick={() => setScratchMode('edit')}>
                Edit
              </button>
              <button type="button" className={`scratchpad-subtab ${scratchMode === 'preview' ? 'active' : ''}`} onClick={() => setScratchMode('preview')}>
                Preview
              </button>
            </div>
            {scratchMode === 'edit' ? (
              <>
                <textarea
                  className="scratchpad project-detail-scratchpad"
                  value={scratch}
                  onChange={e => setScratch(e.target.value)}
                  onBlur={saveScratch}
                  placeholder="Dump raw thoughts, dimensions, links, code snippets, anything..."
                />
                <p className="scratchpad-hint">Use &quot;- [ ] item&quot; for checklists. Links become tappable in Preview.</p>
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
          <button type="button" className="project-action-btn" onClick={() => onUpdate({ ...project, pinned: !project.pinned })}>
            {project.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button type="button" className="project-action-btn" onClick={() => onUpdate({ ...project, archived: !project.archived })}>
            {project.archived ? 'Restore' : 'Archive'}
          </button>
        </div>

        <button type="button" className="project-delete-btn" onClick={() => onDelete(project.id)}>
          <Icons.Trash /> Delete project
        </button>
      </div>
    </div>
  )
}
