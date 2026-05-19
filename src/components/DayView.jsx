import { useState, useRef, useEffect } from 'react'
import { storage, uid } from '../utils/storage.js'
import { Icons } from './Icons.jsx'

// ── Task Item ──────────────────────────────────────────────
function TaskItem({ task, onToggle, onDelete }) {
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
      {task.deferCount > 0 && (
        <span className="task-meta" title="Times deferred">+{task.deferCount}</span>
      )}
      <button className="task-delete" onClick={() => onDelete(task.id)} aria-label="Delete task">
        <Icons.X />
      </button>
    </div>
  )
}

// ── Spark Item ─────────────────────────────────────────────
function SparkItem({ spark, onPromote, onDelete }) {
  return (
    <div className="task-item animate-in">
      <button
        className="task-check"
        onClick={() => onPromote(spark.id)}
        title="Move to today's tasks"
        aria-label="Promote to task"
      >
        <Icons.Inbox />
      </button>
      <span className="task-text">{spark.text}</span>
      <span className="task-meta">
        <Icons.Clock /> {new Date(spark.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric' })}
      </span>
      <button className="task-delete" onClick={() => onDelete(spark.id)} aria-label="Delete spark">
        <Icons.X />
      </button>
    </div>
  )
}

// ── The Day View ───────────────────────────────────────────
export default function DayView() {
  const [tasks, setTasks]   = useState(() => storage.getTasks())
  const [sparks, setSparks] = useState(() => storage.getSparks())
  const [input, setInput]   = useState('')
  const [sparkInput, setSparkInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { storage.saveTasks(tasks) }, [tasks])
  useEffect(() => { storage.saveSparks(sparks) }, [sparks])

  const activeTasks    = tasks.filter(t => !t.done)
  const completedTasks = tasks.filter(t => t.done)

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

  function promoteSpark(id) {
    const spark = sparks.find(s => s.id === id)
    if (!spark) return
    setTasks(prev => [{ id: uid(), text: spark.text, done: false, deferCount: 0 }, ...prev])
    setSparks(prev => prev.filter(s => s.id !== id))
  }

  function deleteSpark(id) {
    setSparks(prev => prev.filter(s => s.id !== id))
  }

  function clearCompleted() {
    setTasks(prev => prev.filter(t => !t.done))
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">Today</h1>
        <p className="section-subtitle">{today}</p>
      </div>

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
            <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
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
              <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
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
        <div className="card" style={{ margin: '0 20px' }}>
          {sparks.map(s => (
            <SparkItem key={s.id} spark={s} onPromote={promoteSpark} onDelete={deleteSpark} />
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '24px 32px' }}>
          <p className="empty-state__label">Sparks are raw thoughts you can promote to tasks.</p>
        </div>
      )}
    </div>
  )
}
