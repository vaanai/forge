// src/components/DayView.jsx
// Main daily dashboard including tasks list, customizable task reminders, agenda, sparks, and configurable Daily Rituals (habits) carousel.
import { useState, useRef } from 'react'
import { uid, getTomorrowKey } from '../utils/storage.js'
import { Icons } from './Icons.jsx'

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
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span className="task-text">{task.text}</span>
        {task.reminderTime && (
          <span style={{ fontSize: '9px', color: 'var(--accent-gold)', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontWeight: 600 }}>
            🔔 Reminder set for {task.reminderTime}
          </span>
        )}
      </div>
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

// ── New Ritual Bottom Sheet ────────────────────────────────
function NewRitualSheet({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [time, setTime] = useState('')
  const [days, setDays] = useState([1, 2, 3, 4, 5]) // Mon-Fri default
  
  const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function toggleDay(dayIdx) {
    setDays(prev => 
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
    )
  }

  function submit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || days.length === 0) return
    onCreate({
      id: 'rit_' + uid(),
      name: trimmed,
      days: days.sort(),
      reminderTime: time || null
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">Add Daily Ritual</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 14 }}>Configure habits that automatically reset daily.</p>
        
        <form onSubmit={submit}>
          <input
            className="sheet-input"
            placeholder="Ritual name (e.g. Morning Meds, Drink Water)"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            required
          />

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Active Days</label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {DOW_LABELS.map((label, idx) => {
                const active = days.includes(idx)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    style={{
                      flex: '1 0 40px',
                      padding: '8px 0',
                      borderRadius: 'var(--radius-sm)',
                      border: active ? '1.5px solid var(--accent-gold)' : '1px solid var(--border)',
                      background: active ? 'var(--accent-gold-bg)' : 'var(--bg-base)',
                      color: active ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      font: '600 11px var(--font-sans)',
                      cursor: 'pointer'
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Optional Notification Alert</label>
            <input
              type="time"
              className="sheet-input"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>

          <button className="sheet-btn" type="submit" style={{ marginTop: 18, background: 'var(--accent-gold)' }}>
            Schedule Ritual
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────
function formatHour(h) {
  if (h === 0)  return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h-12} PM`
}

// ── The Day View ───────────────────────────────────────────
export default function DayView({ 
  tasks = [], 
  setTasks, 
  sparks = [], 
  setSparks, 
  projects = [], 
  setProjects, 
  events = [], 
  rituals = [], 
  setRituals, 
  ritualLog = {}, 
  setRitualLog, 
  todayKey 
}) {
  const [routingSpark, setRoutingSpark] = useState(null)
  const [showRitualSheet, setShowRitualSheet] = useState(false)
  
  const [input, setInput] = useState('')
  const [sparkInput, setSparkInput] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [showReminderPicker, setShowReminderPicker] = useState(false)
  const inputRef = useRef(null)

  // Filter tasks:
  // - Show completed tasks
  // - Show active tasks that are NOT deferred to the future
  const activeTasks    = tasks.filter(t => !t.done && (!t.deferredUntil || t.deferredUntil <= todayKey))
  const completedTasks = tasks.filter(t => t.done)

  // Filter active rituals for today
  const dayOfWeek = new Date().getDay() // 0 = Sun, 1 = Mon ...
  const activeRituals = rituals.filter(r => r.days.includes(dayOfWeek))

  // Calculate Forge progress percentage (including active rituals for today)
  const todayTasks = tasks.filter(t => t.done || !t.deferredUntil || t.deferredUntil <= todayKey)
  const totalTodayItems = todayTasks.length + activeRituals.length
  
  const completedTodayTasks = todayTasks.filter(t => t.done).length
  const completedTodayRituals = activeRituals.filter(r => ritualLog[todayKey]?.[r.id]).length
  const completedTodayItems = completedTodayTasks + completedTodayRituals
  
  const progressPercent = totalTodayItems > 0 ? Math.round((completedTodayItems / totalTodayItems) * 100) : 0

  // Filter today's events for the agenda feed
  const todayEvents = events
    .filter(e => e.dateKey === todayKey)
    .sort((a, b) => a.hour - b.hour)

  // Task submit
  function addTask(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    
    const newTask = {
      id: uid(),
      text,
      done: false,
      deferCount: 0,
      reminderTime: reminderTime || null
    }

    setTasks(prev => [newTask, ...prev])
    setInput('')
    setReminderTime('')
    setShowReminderPicker(false)
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

    const updatedProjects = projects.map(proj => {
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

    setProjects(updatedProjects)
    setSparks(prev => prev.filter(s => s.id !== routingSpark.id))
    setRoutingSpark(null)
  }

  function toggleRitual(id) {
    const todayLog = ritualLog[todayKey] || {}
    const updatedLog = {
      ...ritualLog,
      [todayKey]: {
        ...todayLog,
        [id]: !todayLog[id]
      }
    }
    setRitualLog(updatedLog)
  }

  function createRitual(ritual) {
    setRituals(prev => [ritual, ...prev])
  }

  function deleteRitual(id) {
    setRituals(prev => prev.filter(r => r.id !== id))
  }

  function clearCompleted() {
    setTasks(prev => prev.filter(t => !t.done))
  }

  const todayDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">Today</h1>
        <p className="section-subtitle">{todayDisplay}</p>
      </div>

      {/* Forge Heat Progress Meter */}
      {totalTodayItems > 0 && (
        <div className="forge-meter-container animate-in">
          <div className="forge-meter-header">
            <span className="forge-meter-label">
              {progressPercent === 100 ? (
                <span className="forge-meter-status ignited">🔥 Forge Ignited</span>
              ) : (
                <span className="forge-meter-status">⚡ Forging slate</span>
              )}
            </span>
            <span className="forge-meter-value">{completedTodayItems} / {totalTodayItems} completed</span>
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

      {/* Daily Rituals (Habits) checklist row */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="divider-label" style={{ padding: 0 }}>
            Daily Rituals · {completedTodayRituals}/{activeRituals.length}
          </span>
          <button
            onClick={() => setShowRitualSheet(true)}
            style={{ 
              background: 'var(--accent-gold-bg)', 
              border: 'none', 
              color: 'var(--accent-gold)', 
              font: '600 11px var(--font-sans)', 
              padding: '4px 8px', 
              borderRadius: 'var(--radius-sm)', 
              cursor: 'pointer' 
            }}
          >
            + New Habit
          </button>
        </div>

        {activeRituals.length === 0 ? (
          <div className="card glass-card" style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-surface)' }}>
            <p style={{ font: '400 12px var(--font-sans)', color: 'var(--text-muted)' }}>No rituals scheduled for today.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }}>
            {activeRituals.map(rit => {
              const done = ritualLog[todayKey]?.[rit.id] || false
              return (
                <div
                  key={rit.id}
                  onClick={() => toggleRitual(rit.id)}
                  style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: done ? '1.5px solid var(--accent-gold)' : '1.5px solid var(--border)',
                    background: done ? 'var(--accent-gold-bg)' : 'var(--bg-surface)',
                    color: done ? 'var(--accent-gold)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    boxShadow: done ? '0 0 12px rgba(176, 125, 53, 0.15)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <span style={{ font: '600 13px var(--font-sans)', display: 'block' }}>{rit.name}</span>
                  <span style={{ font: '500 9px var(--font-sans)', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {rit.reminderTime ? `🔔 ${rit.reminderTime}` : 'Check off'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Task input */}
      <form onSubmit={addTask}>
        <div className="input-bar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', width: '100%' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Add a task for today..."
              id="day-task-input"
              autoComplete="off"
              style={{ flex: 1 }}
            />
            
            {/* Custom Task Reminder Trigger Toggle */}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowReminderPicker(p => !p)}
              style={{ margin: '0 4px', color: reminderTime ? 'var(--accent-gold)' : 'var(--text-muted)' }}
              title="Set reminder time"
            >
              <Icons.Clock />
            </button>

            <button className="add-btn" type="submit" aria-label="Add task">
              <Icons.Plus />
            </button>
          </div>

          {/* Time Picker block when enabled */}
          {showReminderPicker && (
            <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', borderTop: '1px solid var(--border)' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Alert Time:</label>
              <input
                type="time"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 8px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans)'
                }}
              />
              {reminderTime && (
                <button
                  type="button"
                  onClick={() => setReminderTime('')}
                  style={{ font: '500 10px var(--font-sans)', border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                >
                  Clear Alert
                </button>
              )}
            </div>
          )}
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

      {/* New Ritual Sheet */}
      {showRitualSheet && (
        <NewRitualSheet
          onClose={() => setShowRitualSheet(false)}
          onCreate={createRitual}
        />
      )}
    </div>
  )
}
