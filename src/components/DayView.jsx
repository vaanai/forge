// src/components/DayView.jsx
// Main daily dashboard including tasks list, customizable task reminders, agenda, sparks, and configurable Daily Rituals (habits) carousel.
import { useState, useRef, useEffect } from 'react'
import { uid, getTomorrowKey, toDateKey } from '../utils/storage.js'
import { getLabels } from '../utils/copy.js'
import { upcomingOnDay } from '../utils/upcoming.js'
import {
  isRecurringTask,
  isTaskDoneOnDay,
  isTaskVisibleInActiveList,
  isTaskVisibleInCompletedList,
  toggleTaskForDay,
  eventMatchesDay,
  DOW_LABELS,
} from '../utils/recurring.js'
import { Icons } from './Icons.jsx'
import { NotificationTimeField, TimePickerField } from './TimePicker.jsx'
import ConfirmSheet from './ConfirmSheet.jsx'
import { getSnoozedTasks, formatRitualDays, formatShortDate } from '../utils/dayPlanner.js'

// ── Task Item ──────────────────────────────────────────────
function TaskItem({ task, onToggle, onDelete, onDefer, doneToday }) {
  const completed = doneToday ?? task.done
  return (
    <div className={`task-item animate-in ${completed ? 'completed' : ''}`}>
      <button
        className={`task-check ${completed ? 'checked' : ''}`}
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
        {isRecurringTask(task) && (
          <span style={{ fontSize: '9px', color: 'var(--accent-blue)', marginTop: '2px', fontWeight: 600 }}>
            ↻ Repeats {task.repeatDays.map(d => DOW_LABELS[d]).join(', ')}
          </span>
        )}
      </div>
      <div className="task-actions">
        {task.deferCount > 0 && (
          <span className="task-meta" title="Times deferred">+{task.deferCount}</span>
        )}
        {!completed && (
          <button
            className="task-action-icon-btn defer-btn"
            onClick={() => onDefer(task.id)}
            title="Postpone to tomorrow"
            aria-label="Postpone task to tomorrow"
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
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [time, setTime] = useState(null)
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
      reminderTime: notifyEnabled && time ? time : null,
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

          <NotificationTimeField
            enabled={notifyEnabled}
            onEnabledChange={setNotifyEnabled}
            time={time}
            onTimeChange={setTime}
          />

          <button className="sheet-btn" type="submit" style={{ marginTop: 18, background: 'var(--accent-gold)' }}>
            Schedule Ritual
          </button>
        </form>
      </div>
    </div>
  )
}

// ── AlloyCard Component ─────────────────────────────────────
function AlloyCard({ alloy, rituals, ritualLog, todayKey, onToggleRitual, onOpenWeldFlow, onDeleteAlloy, temperingClass }) {
  const [open, setOpen] = useState(false)
  const alloyRituals = rituals.filter(r => alloy.ritualIds.includes(r.id))
  const completedCount = alloyRituals.filter(r => ritualLog[todayKey]?.[r.id]).length
  const totalCount = alloyRituals.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className={`alloy-card ${temperingClass}`} style={{ transition: 'all 0.3s ease' }}>
      <div className="alloy-card__header" onClick={() => setOpen(!open)}>
        <div className="alloy-card__title-group">
          <div className="alloy-card__title">
            <span style={{ fontWeight: 600 }}>🔗 {alloy.name}</span>
            {alloy.anchorType !== 'none' && (
              <span className="tag tag--gold" style={{ fontSize: '9px', padding: '1px 6px', marginLeft: '6px' }}>
                ⚓ {alloy.anchorType === 'time' ? `At ${alloy.anchorValue}` : `After ${alloy.anchorValue}`}
              </span>
            )}
          </div>
          <div className="alloy-card__meta">
            <span>{completedCount} / {totalCount} Completed</span>
            <span>•</span>
            <span style={{ color: progressPct === 100 ? 'var(--success)' : 'var(--accent-gold)', fontWeight: 600 }}>
              {progressPct}% Forged
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={e => e.stopPropagation()}>
          {progressPct < 100 && (
            <button
              onClick={() => onOpenWeldFlow(alloy)}
              style={{
                background: 'var(--accent-gold-bg)',
                border: 'none',
                color: 'var(--accent-gold)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
              className="icon-btn-active"
              title="Weld Flow Mode"
            >
              <Icons.Play size={13} />
            </button>
          )}
          
          <button
            onClick={() => {
              if (confirm('Delete this routine?')) {
                onDeleteAlloy(alloy.id)
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Delete Routine"
          >
            <Icons.X size={13} />
          </button>

          <span className={`alloy-card__chevron ${open ? 'open' : ''}`} style={{ display: 'flex', alignItems: 'center' }}>
            <Icons.ChevronDown />
          </span>
        </div>
      </div>

      <div className={`alloy-card__body ${open ? 'open' : ''}`}>
        <div className="alloy-card__body-inner">
          {alloyRituals.map(rit => {
            const done = ritualLog[todayKey]?.[rit.id] || false
            return (
              <div
                key={rit.id}
                className={`alloy-inline-item ${done ? 'done' : ''}`}
                onClick={() => onToggleRitual(rit.id)}
                style={{ cursor: 'pointer' }}
              >
                <span className="alloy-inline-item__text">{rit.name}</span>
                <button
                  className={`task-check ${done ? 'checked' : ''}`}
                  style={{ width: '18px', height: '18px' }}
                  aria-label="Toggle ritual done"
                >
                  <Icons.Check size={10} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── WeldFlowDrawer Component ─────────────────────────────────
function WeldFlowDrawer({ alloy, rituals, ritualLog, todayKey, onToggleRitual, onClose }) {
  const alloyRituals = rituals.filter(r => alloy.ritualIds.includes(r.id))
  const uncheckedRituals = alloyRituals.filter(r => !ritualLog[todayKey]?.[r.id])
  const currentRitual = uncheckedRituals[0]
  
  const completedCount = alloyRituals.filter(r => ritualLog[todayKey]?.[r.id]).length
  const totalCount = alloyRituals.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  function handleCheck() {
    if (currentRitual) {
      if (navigator.vibrate) {
        navigator.vibrate(40)
      }
      onToggleRitual(currentRitual.id)
    }
  }

  return (
    <div className="weld-drawer-backdrop" onClick={onClose}>
      <div className="weld-drawer" onClick={e => e.stopPropagation()}>
        <div className="weld-drawer__header">
          <div>
            <span style={{ font: '600 11px var(--font-sans)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Weld Flow Mode
            </span>
            <h2 className="sheet__title" style={{ margin: 0, fontSize: '18px' }}>🔗 {alloy.name}</h2>
          </div>
          <button className="weld-drawer__close" onClick={onClose}>&times;</button>
        </div>

        <div className="weld-drawer__progress-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>{completedCount} / {totalCount} Completed</span>
            <span>{progressPct}% Forged</span>
          </div>
          <div className="weld-drawer__progress-bar">
            <div className="weld-drawer__progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="weld-drawer__content">
          {currentRitual ? (
            <>
              <div className="weld-drawer__ritual-name">
                {currentRitual.name}
              </div>
              <button className="weld-circle-btn" onClick={handleCheck}>
                <Icons.Check />
              </button>
              <p style={{ marginTop: '24px', font: '500 12px var(--font-sans)', color: 'var(--text-muted)' }}>
                Tap the circle to weld this link
              </p>
            </>
          ) : (
            <div className="weld-drawer__success">
              <div className="weld-drawer__success-icon">🔥</div>
              <h3 style={{ font: '700 22px var(--font-serif)', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Alloy Fully Ignited!
              </h3>
              <p style={{ font: '400 14px var(--font-sans)', color: 'var(--text-muted)', marginBottom: '24px' }}>
                You have forged all elements of this routine today. Excellent work.
              </p>
              <button className="sheet-btn" onClick={onClose} style={{ background: 'var(--accent-gold)', marginTop: 0 }}>
                Return to Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── NewAlloySheet Component ──────────────────────────────────
function NewAlloySheet({ rituals, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [days, setDays] = useState([1, 2, 3, 4, 5])
  const [selectedRitualIds, setSelectedRitualIds] = useState([])
  
  const [anchorType, setAnchorType] = useState('none')
  const [anchorValue, setAnchorValue] = useState('')
  
  const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function toggleDay(dayIdx) {
    setDays(prev => 
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
    )
  }

  function toggleRitual(ritId) {
    setSelectedRitualIds(prev => 
      prev.includes(ritId) ? prev.filter(id => id !== ritId) : [...prev, ritId]
    )
  }

  function submit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || days.length === 0 || selectedRitualIds.length === 0) return
    
    onCreate({
      id: 'alloy_' + uid(),
      name: trimmed,
      days: days.sort(),
      ritualIds: selectedRitualIds,
      anchorType,
      anchorValue: anchorType !== 'none' ? anchorValue.trim() : null
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">Add Alloy Routine</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 14 }}>
          Weld multiple habits into a sequential, trigger-anchored routine.
        </p>
        
        <form onSubmit={submit}>
          <input
            className="sheet-input"
            placeholder="Routine name (e.g. Morning Focus, Bedtime Winddown)"
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
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Select Standalone Habits to Weld
            </label>
            {rituals.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No active habits found. Create some standalone habits first!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '6px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)' }}>
                {rituals.map(rit => {
                  const selected = selectedRitualIds.includes(rit.id)
                  return (
                    <div
                      key={rit.id}
                      onClick={() => toggleRitual(rit.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: selected ? 'var(--accent-gold-bg)' : 'var(--bg-surface)',
                        border: selected ? '1px solid var(--accent-gold)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 500, color: selected ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{rit.name}</span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--accent-gold)' }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Weld Trigger Anchor
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {['none', 'time', 'task'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setAnchorType(type)
                    setAnchorValue(type === 'time' ? (anchorValue && anchorValue.includes(':') ? anchorValue : '08:00') : '')
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 'var(--radius-sm)',
                    border: anchorType === type ? '1.5px solid var(--accent-gold)' : '1px solid var(--border)',
                    background: anchorType === type ? 'var(--accent-gold-bg)' : 'var(--bg-surface)',
                    color: anchorType === type ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    font: '600 11px var(--font-sans)',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            {anchorType === 'time' && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <TimePickerField
                  value={anchorValue || '08:00'}
                  onChange={setAnchorValue}
                />
              </div>
            )}

            {anchorType === 'task' && (
              <input
                type="text"
                className="sheet-input"
                placeholder="Anchor Task (e.g. Gym, Standup, Journal)"
                value={anchorValue}
                onChange={e => setAnchorValue(e.target.value)}
                required
              />
            )}
          </div>

          <button
            className="sheet-btn"
            type="submit"
            disabled={selectedRitualIds.length === 0}
            style={{ marginTop: 18, background: 'var(--accent-gold)', opacity: selectedRitualIds.length === 0 ? 0.5 : 1 }}
          >
            Forge Alloy Routine
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Tempering Streaks Helper ─────────────────────────────────
function getAlloyTemperingClass(alloy, ritualLog, rituals) {
  const alloyRituals = rituals.filter(r => alloy.ritualIds.includes(r.id))
  if (alloyRituals.length === 0) return 'tempering-raw'

  let streak = 0
  const today = new Date()
  let checkDate = new Date(today)
  const todayKey = toDateKey(today)
  
  for (let d = 0; d < 100; d++) {
    const key = toDateKey(checkDate)
    const isToday = key === todayKey
    
    const dayOfWeek = checkDate.getDay()
    const isActiveOnDay = alloy.days.includes(dayOfWeek)
    
    if (isActiveOnDay) {
      const logged = ritualLog[key] || {}
      const completedAll = alloyRituals.every(r => logged[r.id])
      
      if (completedAll) {
        streak++
      } else {
        if (!isToday) break
      }
    }
    checkDate.setDate(checkDate.getDate() - 1)
  }

  if (streak >= 21) return 'tempering-damascus'
  if (streak >= 7)  return 'tempering-steel'
  if (streak >= 3)  return 'tempering-bronze'
  return 'tempering-raw'
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
  onCreateRitual,
  onDeleteRitual,
  ritualLog = {}, 
  setRitualLog, 
  todayKey,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDeferTask,
  alloys = [],
  setAlloys,
  onCreateAlloy,
  onDeleteAlloy,
  plainLanguage = false,
  dayNote = '',
  onSaveDayNote,
  onOpenPastNotes,
  upcoming = [],
  onCompleteUpcoming,
  onPromoteUpcoming,
}) {
  const labels = getLabels(plainLanguage)

  const [routingSpark, setRoutingSpark] = useState(null)
  const [showRitualSheet, setShowRitualSheet] = useState(false)
  const [weldFlowAlloy, setWeldFlowAlloy] = useState(null)
  const [showAlloySheet, setShowAlloySheet] = useState(false)
  const [stackingToast, setStackingToast] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [ritualToast, setRitualToast] = useState(null)
  const [dayNoteExpanded, setDayNoteExpanded] = useState(false)
  
  const [input, setInput] = useState('')
  const [sparkInput, setSparkInput] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState(null)
  const [taskRepeats, setTaskRepeats] = useState(false)
  const [taskRepeatDays, setTaskRepeatDays] = useState([1, 2, 3, 4, 5])
  const [dayNoteDraft, setDayNoteDraft] = useState(dayNote)
  const inputRef = useRef(null)

  useEffect(() => {
    setDayNoteDraft(dayNote)
  }, [dayNote, todayKey])

  const activeTasks = tasks.filter(t => isTaskVisibleInActiveList(t, todayKey))
  const completedTasks = tasks.filter(t => isTaskVisibleInCompletedList(t, todayKey))
  const snoozedTasks = getSnoozedTasks(tasks, todayKey)

  // Filter active rituals for today
  const dayOfWeek = new Date().getDay() // 0 = Sun, 1 = Mon ...
  const activeRituals = rituals.filter(r => r.days.includes(dayOfWeek))

  // Filter active alloys for today
  const activeAlloys = (alloys || []).filter(a => a.days.includes(dayOfWeek))

  // Standalone rituals (not part of any alloy today)
  const standaloneRituals = activeRituals.filter(r => !(alloys || []).some(a => a.ritualIds.includes(r.id)))

  const todayTasks = tasks.filter(t => {
    if (isRecurringTask(t)) return t.repeatDays.includes(dayOfWeek)
    return !t.deferredUntil || t.deferredUntil <= todayKey
  })
  const totalTodayItems = todayTasks.length + activeRituals.length
  
  const completedTodayTasks = todayTasks.filter(t => isTaskDoneOnDay(t, todayKey)).length
  const completedTodayRituals = activeRituals.filter(r => ritualLog[todayKey]?.[r.id]).length
  const completedTodayItems = completedTodayTasks + completedTodayRituals
  
  const progressPercent = totalTodayItems > 0 ? Math.round((completedTodayItems / totalTodayItems) * 100) : 0

  const todayDue = upcomingOnDay(upcoming, todayKey)

  // Filter today's events for the agenda feed
  const todayEvents = events
    .filter(e => eventMatchesDay(e, todayKey))
    .sort((a, b) => a.hour - b.hour)

  function toggleRepeatDay(dayIdx) {
    setTaskRepeatDays(prev =>
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
    )
  }

  async function addTask(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    
    const newTask = {
      id: uid(),
      text,
      done: false,
      deferCount: 0,
      reminderTime: notifyEnabled && reminderTime ? reminderTime : null,
      ...(taskRepeats && taskRepeatDays.length > 0 ? { repeatDays: [...taskRepeatDays].sort() } : {}),
    }

    if (notifyEnabled && reminderTime && onAddTask) {
      await onAddTask(newTask)
    } else {
      setTasks(prev => [newTask, ...prev])
    }
    setInput('')
    setNotifyEnabled(false)
    setReminderTime(null)
    setTaskRepeats(false)
  }

  function addSpark(e) {
    e.preventDefault()
    const text = sparkInput.trim()
    if (!text) return
    setSparks(prev => [{ id: uid(), text, createdAt: Date.now() }, ...prev])
    setSparkInput('')
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const wasDone = isTaskDoneOnDay(task, todayKey)
    if (onToggleTask) {
      onToggleTask(id, todayKey).then(() => {
        if (!wasDone) checkHabitStackingTrigger('task', task.text)
      })
    } else {
      setTasks(prev => prev.map(t => {
        if (t.id === id) {
          const next = toggleTaskForDay(t, todayKey)
          if (isTaskDoneOnDay(next, todayKey)) checkHabitStackingTrigger('task', t.text)
          return next
        }
        return t
      }))
    }
  }

  function checkHabitStackingTrigger(type, triggerText) {
    if (!triggerText) return
    const cleanText = triggerText.toLowerCase().trim()
    const activeAlloysToday = alloys.filter(a => a.days.includes(dayOfWeek))
    
    const matchedAlloy = activeAlloysToday.find(a => {
      if (a.anchorType !== 'task') return false
      return cleanText.includes(a.anchorValue.toLowerCase().trim()) || a.anchorValue.toLowerCase().trim().includes(cleanText)
    })
    
    if (matchedAlloy) {
      const alloyRituals = rituals.filter(r => matchedAlloy.ritualIds.includes(r.id))
      const completedCount = alloyRituals.filter(r => ritualLog[todayKey]?.[r.id]).length
      if (completedCount < alloyRituals.length) {
        setStackingToast({ alloy: matchedAlloy, triggerName: triggerText })
        setTimeout(() => {
          setStackingToast(curr => curr && curr.alloy.id === matchedAlloy.id ? null : curr)
        }, 6000)
      }
    }
  }

  function deleteTask(id) {
    if (onDeleteTask) onDeleteTask(id)
    else setTasks(prev => prev.filter(t => t.id !== id))
  }

  function requestDelete(id) {
    const task = tasks.find(t => t.id === id)
    setConfirmAction({ type: 'delete', taskId: id, taskText: task?.text || 'this task' })
  }

  function requestDefer(id) {
    const task = tasks.find(t => t.id === id)
    setConfirmAction({ type: 'defer', taskId: id, taskText: task?.text || 'this task' })
  }

  function handleConfirmAction() {
    if (!confirmAction) return
    if (confirmAction.type === 'defer') deferTask(confirmAction.taskId)
    else deleteTask(confirmAction.taskId)
    setConfirmAction(null)
  }

  function deferTask(id) {
    if (onDeferTask) onDeferTask(id)
    else {
      const tomorrowKey = getTomorrowKey()
      setTasks(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            deferCount: (t.deferCount || 0) + 1,
            deferredUntil: tomorrowKey,
          }
        }
        return t
      }))
    }
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
    if (onCreateRitual) onCreateRitual(ritual)
    const isActiveToday = ritual.days.includes(dayOfWeek)
    const daysLabel = formatRitualDays(ritual)
    const calendarNote = ' See Calendar to view on other days.'
    setRitualToast(
      isActiveToday
        ? `"${ritual.name}" saved — active today (${daysLabel}).${calendarNote}`
        : `"${ritual.name}" saved — runs on ${daysLabel}.${calendarNote}`
    )
    setTimeout(() => setRitualToast(null), 5000)
  }

  function deleteRitual(id) {
    if (onDeleteRitual) onDeleteRitual(id)
  }

  function clearCompleted() {
    setTasks(prev => prev
      .filter(t => !t.done || isRecurringTask(t))
      .map(t => {
        if (isRecurringTask(t) && isTaskDoneOnDay(t, todayKey)) {
          return {
            ...t,
            completedDates: (t.completedDates || []).filter(d => d !== todayKey),
          }
        }
        return t
      })
    )
  }

  function saveDayNote() {
    if (onSaveDayNote) onSaveDayNote(todayKey, dayNoteDraft)
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
                <span className="forge-meter-status ignited">🔥 {labels.forgeIgnited}</span>
              ) : (
                <span className="forge-meter-status">⚡ {labels.forgeProgress}</span>
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
              {labels.forgeCelebration}
            </div>
          )}
        </div>
      )}

      {/* Daily Rituals (Habits) checklist row */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="divider-label" style={{ padding: 0 }}>
            {labels.rituals} · {completedTodayRituals}/{activeRituals.length}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
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
              {labels.newHabit}
            </button>
            <button
              onClick={() => setShowAlloySheet(true)}
              style={{ 
                background: 'var(--accent-blue-bg)', 
                border: 'none', 
                color: 'var(--accent-blue)', 
                font: '600 11px var(--font-sans)', 
                padding: '4px 8px', 
                borderRadius: 'var(--radius-sm)', 
                cursor: 'pointer' 
              }}
            >
              {labels.newRoutine}
            </button>
          </div>
        </div>

        {activeAlloys.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
            {activeAlloys.map(alloy => (
              <AlloyCard
                key={alloy.id}
                alloy={alloy}
                rituals={rituals}
                ritualLog={ritualLog}
                todayKey={todayKey}
                onToggleRitual={toggleRitual}
                onOpenWeldFlow={setWeldFlowAlloy}
                onDeleteAlloy={onDeleteAlloy}
                temperingClass={getAlloyTemperingClass(alloy, ritualLog, rituals)}
              />
            ))}
          </div>
        )}

        {activeRituals.length === 0 ? (
          <div className="card glass-card" style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-surface)' }}>
            <p style={{ font: '400 12px var(--font-sans)', color: 'var(--text-muted)' }}>{labels.noRitualsToday}</p>
          </div>
        ) : (
          standaloneRituals.length > 0 && (
            <>
              {activeAlloys.length > 0 && (
                <div className="divider-label" style={{ padding: '4px 0 8px', fontSize: '10px' }}>{labels.standaloneHabits}</div>
              )}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }}>
                {standaloneRituals.map(rit => {
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
            </>
          )
        )}
      </div>

      {/* Day note */}
      <div className="day-note-block" style={{ padding: '0 20px 16px' }}>
        <div className="day-note-header">
          <div className="divider-label" style={{ padding: 0 }}>{labels.dayNote}</div>
          {onOpenPastNotes && (
            <button type="button" className="day-note-past-link" onClick={onOpenPastNotes}>
              {labels.pastNotes}
            </button>
          )}
        </div>
        {dayNoteExpanded ? (
          <div className="day-note-expanded">
            <textarea
              className="day-note-input"
              value={dayNoteDraft}
              onChange={e => setDayNoteDraft(e.target.value)}
              placeholder={labels.dayNotePlaceholder}
              rows={4}
              id="day-note-input"
              autoFocus
            />
            <button
              type="button"
              className="day-note-done-btn"
              onClick={() => { saveDayNote(); setDayNoteExpanded(false) }}
            >
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="day-note-collapsed"
            onClick={() => setDayNoteExpanded(true)}
            id="day-note-input"
          >
            {dayNoteDraft.trim()
              ? dayNoteDraft.trim().split('\n')[0]
              : labels.dayNotePlaceholder}
          </button>
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
            
            <button className="add-btn" type="submit" aria-label="Add task">
              <Icons.Plus />
            </button>
          </div>

          <NotificationTimeField
            enabled={notifyEnabled}
            onEnabledChange={setNotifyEnabled}
            time={reminderTime}
            onTimeChange={setReminderTime}
          />

          <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={taskRepeats}
                onChange={e => setTaskRepeats(e.target.checked)}
              />
              Repeat weekly
            </label>
          </div>
          {taskRepeats && (
            <div className="repeat-day-row animate-in">
              {DOW_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  className={`repeat-day-chip ${taskRepeatDays.includes(idx) ? 'active' : ''}`}
                  onClick={() => toggleRepeatDay(idx)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Due today banner */}
      {todayDue.length > 0 && (
        <div className="due-today-banner animate-in">
          <div className="due-today-banner__title">{labels.dueToday} · {todayDue.length}</div>
          {todayDue.map(item => (
            <div key={item.id} className="due-item" style={{ marginBottom: 6 }}>
              <span className="due-item__name">{item.text}</span>
              <div className="upcoming-row__actions">
                <button type="button" className="upcoming-action-btn upcoming-action-btn--primary" onClick={() => onPromoteUpcoming?.(item.id)}>
                  Today
                </button>
                <button type="button" className="upcoming-action-btn" onClick={() => onCompleteUpcoming?.(item.id)}>Done</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active tasks */}
      {activeTasks.length > 0 ? (
        <div className="card" style={{ margin: '0 20px 8px' }}>
          {activeTasks.map(t => (
            <TaskItem 
              key={t.id} 
              task={t} 
              doneToday={isTaskDoneOnDay(t, todayKey)}
              onToggle={toggleTask} 
              onDelete={requestDelete} 
              onDefer={requestDefer}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state__icon"><Icons.Day /></div>
          <p className="empty-state__label">{labels.emptySlate}</p>
        </div>
      )}

      {snoozedTasks.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 8px' }}>
            <span className="divider-label" style={{ padding: 0 }}>
              Snoozed · {snoozedTasks.length}
            </span>
          </div>
          <div className="card snoozed-card" style={{ margin: '0 20px 8px' }}>
            {snoozedTasks.map(t => (
              <div key={t.id} className="snoozed-item">
                <span className="task-text">{t.text}</span>
                <span className="snoozed-item__date">Until {formatShortDate(t.deferredUntil)}</span>
              </div>
            ))}
          </div>
        </>
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
                doneToday={isTaskDoneOnDay(t, todayKey)}
                onToggle={toggleTask} 
                onDelete={requestDelete} 
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
                <div className="agenda-name">
                  {event.name}
                  {event.notes?.trim() && (
                    <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 11 }} title="Has notes">📝</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sparks Inbox */}
      <div className="divider-label">{labels.sparksInbox}</div>
      <form onSubmit={addSpark}>
        <div className="input-bar" style={{ borderColor: 'var(--accent-gold-bg)' }}>
          <input
            value={sparkInput}
            onChange={e => setSparkInput(e.target.value)}
            placeholder={labels.sparkCapture}
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
          <p className="empty-state__label">{labels.sparkEmpty}</p>
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

      {/* New Alloy Sheet */}
      {showAlloySheet && (
        <NewAlloySheet
          rituals={rituals}
          onClose={() => setShowAlloySheet(false)}
          onCreate={onCreateAlloy}
        />
      )}

      {/* Weld Flow Drawer */}
      {weldFlowAlloy && (
        <WeldFlowDrawer
          alloy={weldFlowAlloy}
          rituals={rituals}
          ritualLog={ritualLog}
          todayKey={todayKey}
          onToggleRitual={toggleRitual}
          onClose={() => setWeldFlowAlloy(null)}
        />
      )}

      {confirmAction && (
        <ConfirmSheet
          title={confirmAction.type === 'defer' ? 'Postpone to tomorrow?' : 'Delete task?'}
          message={
            confirmAction.type === 'defer'
              ? `"${confirmAction.taskText}" will move to tomorrow. You'll find it under Snoozed until then.`
              : `"${confirmAction.taskText}" will be permanently removed.`
          }
          confirmLabel={confirmAction.type === 'defer' ? 'Postpone' : 'Delete'}
          danger={confirmAction.type === 'delete'}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {ritualToast && (
        <div className="share-toast">{ritualToast}</div>
      )}

      {/* Habit Stacking Trigger Toast */}
      {stackingToast && (
        <div className="weld-toast">
          <div className="weld-toast__info">
            <div className="weld-toast__title">
              <span>🔗 Habit Stack Link</span>
            </div>
            <div className="weld-toast__desc">
              Anchor: "{stackingToast.triggerName}" complete. Start {stackingToast.alloy.name}?
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="weld-toast__btn"
              onClick={() => {
                setWeldFlowAlloy(stackingToast.alloy)
                setStackingToast(null)
              }}
            >
              {labels.weld}
            </button>
            <button
              className="weld-toast__btn"
              style={{ background: 'none', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
              onClick={() => setStackingToast(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
