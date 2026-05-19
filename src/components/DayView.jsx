import { useState, useRef, useEffect } from 'react'
import { storage, uid, getTodayKey, getTomorrowKey } from '../utils/storage.js'
import { Icons } from './Icons.jsx'

// ── Helpers ────────────────────────────────────────────────
function formatHour(h) {
  if (h === 0)  return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h-12} PM`
}

// ── Task Item ──────────────────────────────────────────────
function TaskItem({ task, onToggle, onDelete, onDefer }) {
  return (
    <div className={`task-item animate-in ${task.done ? 'completed' : ''}`}>
      <button
        className={`task-check ${task.done ? 'checked' : ''}`}
        onClick={() => onToggle(task.id)}
        aria-label="Complete task"
      >
        <Icons.Check />
      </button>
      <span className="task-text">{task.text}</span>
      <div className="task-actions">
        {task.deferCount > 0 && (
          <span className="task-meta" title="Times deferred">+{task.deferCount}</span>
        )}
        {!task.done && (
          <button
            className="task-action-icon-btn defer-btn"
            onClick={() => onDefer(task.id)}
            title="Snooze to tomorrow"
            aria-label="Defer task to tomorrow"
          >
            <Icons.ArrowRight size={13} />
          </button>
        )}
        <button 
          className="task-action-icon-btn delete-btn" 
          onClick={() => onDelete(task.id)} 
          aria-label="Delete task"
        >
          <Icons.X size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Spark Item ─────────────────────────────────────────────
function SparkItem({ spark, onPromote, onRoute, onDelete }) {
  return (
    <div className="task-item animate-in">
      <button
        className="task-check"
        onClick={() => onPromote(spark.id)}
        title="Promote to today's tasks"
        aria-label="Promote to task"
      >
        <Icons.Inbox />
      </button>
      <span className="task-text">{spark.text}</span>
      <div className="task-actions">
        <button
          className="task-action-icon-btn route-btn"
          onClick={() => onRoute(spark)}
          title="File to Project"
          aria-label="File to project"
        >
          <Icons.FolderPlus size={13} />
        </button>
        <span className="task-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Icons.Clock /> {new Date(spark.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric' })}
        </span>
        <button 
          className="task-action-icon-btn delete-btn" 
          onClick={() => onDelete(spark.id)} 
          aria-label="Delete spark"
        >
          <Icons.X size={13} />
        </button>
      </div>
    </div>
  )
}

// ── File Spark Bottom Sheet ────────────────────────────────
function FileSparkSheet({ spark, projects, onClose, onFile }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title" style={{ marginBottom: 6 }}>File Spark</h2>
        <div className="sheet-spark-preview">
          "{spark.text}"
        </div>
        
        {projects.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: 8 }}>No active projects found.</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Go to the Projects tab to create a laboratory.</p>
          </div>
        ) : (
          <div className="sheet-projects-list">
            {projects.map(project => (
              <div key={project.id} className="sheet-project-row">
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <div className="sheet-project-name">{project.name}</div>
                  {project.tag && <span className="tag tag--muted" style={{ padding: '1px 6px', fontSize: '9px', marginTop: 2 }}>{project.tag}</span>}
                </div>
                <div className="sheet-project-actions">
                  <button 
                    className="sheet-project-action-btn"
                    onClick={() => onFile(project.id, 'task')}
                  >
                    As Task
                  </button>
                  <button 
                    className="sheet-project-action-btn secondary"
                    onClick={() => onFile(project.id, 'scratch')}
                  >
                    + Notes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="sheet-btn secondary-btn" onClick={onClose} style={{ marginTop: 16 }}>Cancel</button>
      </div>
    </div>
  )
}

// ── The Day View ───────────────────────────────────────────
export default function DayView() {
  const [tasks, setTasks]   = useState(() => storage.getTasks())
  const [sparks, setSparks] = useState(() => storage.getSparks())
  const [projects, setProjects] = useState(() => storage.getProjects())
  const [events, setEvents] = useState(() => storage.getEvents())
  const [routingSpark, setRoutingSpark] = useState(null)
  
  const [input, setInput]   = useState('')
  const [sparkInput, setSparkInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { storage.saveTasks(tasks) }, [tasks])
  useEffect(() => { storage.saveSparks(sparks) }, [sparks])

  const todayKey = getTodayKey()

  // Filter tasks:
  // - Show completed tasks
  // - Show active tasks that are NOT deferred to the future
  const activeTasks    = tasks.filter(t => !t.done && (!t.deferredUntil || t.deferredUntil <= todayKey))
  const completedTasks = tasks.filter(t => t.done)

  // Calculate Forge progress percentage
  const todayTasks = tasks.filter(t => t.done || !t.deferredUntil || t.deferredUntil <= todayKey)
  const totalToday = todayTasks.length
  const completedToday = todayTasks.filter(t => t.done).length
  const progressPercent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0

  // Filter today's events for the agenda feed
  const todayEvents = events
    .filter(e => e.dateKey === todayKey)
    .sort((a, b) => a.hour - b.hour)

  function addTask(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTasks(prev => [{ id: uid(), text, done: false, deferCount: 0 }, ...prev])
    setInput('')
  }

  function addSpark(e) {
    e.preventDefault()
    const text = sparkInput.trim()
    if (!text) return
    setSparks(prev => [{ id: uid(), text, createdAt: Date.now() }, ...prev])
    setSparkInput('')
  }

  function toggleTask(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function deferTask(id) {
    const tomorrowKey = getTomorrowKey()
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          deferCount: (t.deferCount || 0) + 1,
          deferredUntil: tomorrowKey
        }
      }
      return t
    }))
  }

  function promoteSpark(id) {
    const spark = sparks.find(s => s.id === id)
    if (!spark) return
    setTasks(prev => [{ id: uid(), text: spark.text, done: false, deferCount: 0 }, ...prev])
    setSparks(prev => prev.filter(s => s.id !== id))
  }

  function deleteSpark(id) {
    setSparks(prev => prev.filter(s => s.id !== id))
  }

  function handleFileSpark(projectId, type) {
    if (!routingSpark) return

    // 1. Get active projects
    const allProjects = storage.getProjects()
    const updatedProjects = allProjects.map(proj => {
      if (proj.id === projectId) {
        if (type === 'task') {
          return {
            ...proj,
            tasks: [{ id: uid(), text: routingSpark.text, done: false }, ...(proj.tasks || [])]
          }
        } else if (type === 'scratch') {
          const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          const appendText = `\n\n[Spark Captured ${timestamp}]:\n${routingSpark.text}`
          return {
            ...proj,
            scratchpad: proj.scratchpad ? `${proj.scratchpad}${appendText}` : routingSpark.text
          }
        }
      }
      return proj
    })

    // 2. Save projects to storage
    storage.saveProjects(updatedProjects)
    setProjects(updatedProjects)

    // 3. Delete spark
    setSparks(prev => prev.filter(s => s.id !== routingSpark.id))

    // 4. Close routing modal
    setRoutingSpark(null)
  }

  function clearCompleted() {
    setTasks(prev => prev.filter(t => !t.done))
  }

  const todayDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Refresh calendar events on mount (to make sure agenda is up-to-date)
  useEffect(() => {
    setEvents(storage.getEvents())
    setProjects(storage.getProjects())
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">Today</h1>
        <p className="section-subtitle">{todayDisplay}</p>
      </div>

      {/* Forge Heat Progress Meter */}
      {totalToday > 0 && (
        <div className="forge-meter-container animate-in">
          <div className="forge-meter-header">
            <span className="forge-meter-label">
              {progressPercent === 100 ? (
                <span className="forge-meter-status ignited">🔥 Forge Ignited</span>
              ) : (
                <span className="forge-meter-status">⚡ Forging slate</span>
              )}
            </span>
            <span className="forge-meter-value">{completedToday} / {totalToday} completed</span>
          </div>
          <div className="forge-meter-track">
            <div 
              className={`forge-meter-fill ${progressPercent === 100 ? 'ignited' : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressPercent === 100 && (
            <div className="forge-meter-celebration">
              The Forge is fully ignited. Excellent work today!
            </div>
          )}
        </div>
      )}

      {/* Task input */}
      <form onSubmit={addTask}>
        <div className="input-bar">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add a task for today..."
            id="day-task-input"
            autoComplete="off"
          />
          <button className="add-btn" type="submit" aria-label="Add task">
            <Icons.Plus />
          </button>
        </div>
      </form>

      {/* Active tasks */}
      {activeTasks.length > 0 ? (
        <div className="card" style={{ margin: '0 20px 8px' }}>
          {activeTasks.map(t => (
            <TaskItem 
              key={t.id} 
              task={t} 
              onToggle={toggleTask} 
              onDelete={deleteTask} 
              onDefer={deferTask}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state__icon"><Icons.Day /></div>
          <p className="empty-state__label">Nothing on the slate. Add something above.</p>
        </div>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
            <span className="divider-label" style={{ padding: 0 }}>
              Completed · {completedTasks.length}
            </span>
            <button
              onClick={clearCompleted}
              style={{ font: '500 11px var(--font-sans)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear all
            </button>
          </div>
          <div className="card" style={{ margin: '0 20px 8px' }}>
            {completedTasks.map(t => (
              <TaskItem 
                key={t.id} 
                task={t} 
                onToggle={toggleTask} 
                onDelete={deleteTask} 
              />
            ))}
          </div>
        </>
      )}

      {/* Today's Agenda Feed */}
      {todayEvents.length > 0 && (
        <>
          <div className="divider-label">Today's Agenda</div>
          <div className="card" style={{ margin: '0 20px 16px' }}>
            {todayEvents.map(event => (
              <div key={event.id} className="agenda-item animate-in">
                <div className="agenda-time">{formatHour(event.hour)}</div>
                <div className={`agenda-indicator ${event.color || 'blue'}`} />
                <div className="agenda-name">{event.name}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sparks Inbox */}
      <div className="divider-label">Sparks Inbox</div>
      <form onSubmit={addSpark}>
        <div className="input-bar" style={{ borderColor: 'var(--accent-gold-bg)' }}>
          <input
            value={sparkInput}
            onChange={e => setSparkInput(e.target.value)}
            placeholder="Capture a quick thought, idea, or note..."
            id="spark-input"
            autoComplete="off"
          />
          <button
            className="add-btn"
            type="submit"
            style={{ background: 'var(--accent-gold)' }}
            aria-label="Add spark"
          >
            <Icons.Plus />
          </button>
        </div>
      </form>

      {sparks.length > 0 ? (
        <div className="card" style={{ margin: '0 20px 24px' }}>
          {sparks.map(s => (
            <SparkItem 
              key={s.id} 
              spark={s} 
              onPromote={promoteSpark} 
              onRoute={setRoutingSpark}
              onDelete={deleteSpark} 
            />
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '24px 32px 32px' }}>
          <p className="empty-state__label">Sparks are raw thoughts you can promote to tasks or file to projects.</p>
        </div>
      )}

      {/* Sparks Routing Sheet */}
      {routingSpark && (
        <FileSparkSheet
          spark={routingSpark}
          projects={projects}
          onClose={() => setRoutingSpark(null)}
          onFile={handleFileSpark}
        />
      )}
    </div>
  )
}

