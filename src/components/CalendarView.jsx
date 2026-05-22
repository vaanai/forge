import { useState } from 'react'
import { uid } from '../utils/storage.js'
import { eventMatchesDay, DOW_LABELS } from '../utils/recurring.js'
import { upcomingOnDay, getComingUpItems, formatDueLabel, daysWithUpcoming } from '../utils/upcoming.js'
import { getDayPlanSummary, formatBadgeCount } from '../utils/dayPlanner.js'
import { getLabels } from '../utils/copy.js'
import { Icons } from './Icons.jsx'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0–23

const COLOR_OPTIONS = [
  { label: 'Blue',   value: 'blue'   },
  { label: 'Gold',   value: 'gold'   },
  { label: 'Dark',   value: 'obsidian' },
]

// ── Helpers ────────────────────────────────────────────────
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function formatHour(h) {
  if (h === 0)  return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h-12} PM`
}

// ── Add Event Sheet ────────────────────────────────────────
function AddEventSheet({ dateKey, onClose, onAdd }) {
  const [name,  setName]  = useState('')
  const [notes, setNotes] = useState('')
  const [hour,  setHour]  = useState(8)
  const [duration, setDuration] = useState(1)
  const [color, setColor] = useState('blue')
  const [repeats, setRepeats] = useState(false)
  const [repeatDays, setRepeatDays] = useState([new Date(dateKey + 'T12:00:00').getDay()])

  function toggleDay(dayIdx) {
    setRepeatDays(prev =>
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
    )
  }

  function submit(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const base = { id: uid(), name: n, hour: Number(hour), duration: Number(duration), color, notes: notes.trim() }
    if (repeats && repeatDays.length > 0) {
      onAdd({ ...base, repeatDays: [...repeatDays].sort() })
    } else {
      onAdd({ ...base, dateKey })
    }
    onClose()
  }

  const label = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">Add Event</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 14 }}>{label}</p>
        <form onSubmit={submit}>
          <input
            className="sheet-input"
            placeholder="Event name (e.g. Basketball practice, Math homework)"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            id="event-name-input"
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Start Time</label>
              <select
                className="sheet-input"
                value={hour}
                onChange={e => setHour(e.target.value)}
                id="event-hour-select"
              >
                {HOURS.map(h => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Duration</label>
              <select
                className="sheet-input"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                id="event-duration-select"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={3}>3 hours</option>
                <option value={4}>4 hours</option>
                <option value={5}>5 hours</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: color === c.value ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                id={`event-color-${c.value}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={repeats} onChange={e => setRepeats(e.target.checked)} />
            Repeat weekly
          </label>
          {repeats && (
            <div className="repeat-day-row" style={{ marginTop: 10 }}>
              {DOW_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  className={`repeat-day-chip ${repeatDays.includes(idx) ? 'active' : ''}`}
                  onClick={() => toggleDay(idx)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginTop: 14, marginBottom: 4 }}>
            Notes (optional)
          </label>
          <textarea
            className="event-detail-notes"
            style={{ marginTop: 0 }}
            placeholder="Bring materials, topics to discuss..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />

          <button className="sheet-btn" type="submit" style={{ marginTop: 14 }}>Add Event</button>
        </form>
      </div>
    </div>
  )
}

function EventDetailSheet({ event, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(event.notes || '')

  const duration = event.duration || 1
  const endHour = event.hour + duration
  const timeLabel = `${formatHour(event.hour)} – ${formatHour(endHour >= 24 ? endHour - 24 : endHour)}`

  function saveNotes() {
    onUpdate({ ...event, notes: notes.trim() })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">{event.name}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 4 }}>{timeLabel}</p>
        {event.repeatDays?.length ? (
          <p style={{ fontSize: '12px', color: 'var(--accent-blue)', marginBottom: 12 }}>
            Repeats weekly ({event.repeatDays.map(d => DOW_LABELS[d]).join(', ')})
          </p>
        ) : event.dateKey ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12 }}>
            {new Date(event.dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        ) : null}

        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
          Notes
        </label>
        <textarea
          className="event-detail-notes"
          style={{ marginTop: 0 }}
          placeholder="Add notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={4}
        />

        <button className="sheet-btn" type="button" style={{ marginTop: 14 }} onClick={() => { saveNotes(); onClose() }}>
          Save
        </button>
        <button
          className="sheet-btn secondary-btn"
          type="button"
          style={{ marginTop: 8 }}
          onClick={() => { onDelete(event.id); onClose() }}
        >
          Delete event
        </button>
      </div>
    </div>
  )
}

function AddUpcomingSheet({ dateKey, onClose, onAdd, labels }) {
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState(dateKey)

  function submit(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t || !dueDate) return
    onAdd({ id: uid(), text: t, dueDate, done: false, createdAt: Date.now() })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">{labels.addDeadline}</h2>
        <form onSubmit={submit}>
          <input
            className="sheet-input"
            placeholder="Assignment or task (e.g. Calc problem set 3)"
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginTop: 12, marginBottom: 4 }}>
            Due date
          </label>
          <input
            className="sheet-input"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
          <button className="sheet-btn" type="submit" style={{ marginTop: 14 }}>Add</button>
        </form>
      </div>
    </div>
  )
}

function UpcomingRow({ item, todayKey, onComplete, onPromote, onDelete }) {
  const overdue = item.dueDate < todayKey
  return (
    <div className="upcoming-row">
      <span className="upcoming-row__date">{formatDueLabel(item.dueDate, todayKey)}</span>
      <span className={`upcoming-row__text ${overdue ? 'overdue' : ''}`}>{item.text}</span>
      <div className="upcoming-row__actions">
        <button type="button" className="upcoming-action-btn upcoming-action-btn--primary" onClick={() => onPromote(item.id)}>
          Today
        </button>
        <button type="button" className="upcoming-action-btn" onClick={() => onComplete(item.id)}>Done</button>
        <button type="button" className="upcoming-action-btn" onClick={() => onDelete(item.id)} aria-label="Delete">
          <Icons.X size={10} />
        </button>
      </div>
    </div>
  )
}

function DayPlannerPanel({ dateKey, tasks, rituals, alloys, events, expanded, onToggle }) {
  const summary = getDayPlanSummary(tasks, rituals, events, dateKey, alloys)
  const count = summary.total

  return (
    <div className="day-planner-panel">
      <button type="button" className="day-planner-panel__toggle" onClick={onToggle}>
        <span className="day-planner-panel__label">Tasks, habits & routines</span>
        {count > 0 && (
          <span className="day-planner-panel__badge" aria-label={`${count} items`}>
            {formatBadgeCount(count)}
          </span>
        )}
        <span className={`day-planner-panel__chevron ${expanded ? 'open' : ''}`}>
          <Icons.ChevronDown />
        </span>
      </button>
      {expanded && (
        <div className="day-planner-panel__body">
          {count === 0 ? (
            <p className="day-planner-panel__empty">Nothing scheduled for this day.</p>
          ) : (
            <>
              {summary.alloys.length > 0 && (
                <div className="day-planner-panel__section">
                  <div className="day-planner-panel__section-title">Routines · {formatBadgeCount(summary.alloys.length)}</div>
                  {summary.alloys.map(a => (
                    <div key={a.id} className="day-planner-panel__row">
                      <span className="day-planner-panel__dot day-planner-panel__dot--routine" />
                      <span>{a.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {summary.tasks.length > 0 && (
                <div className="day-planner-panel__section">
                  <div className="day-planner-panel__section-title">Tasks · {formatBadgeCount(summary.tasks.length)}</div>
                  {summary.tasks.map(t => (
                    <div key={t.id} className="day-planner-panel__row">
                      <span className="day-planner-panel__dot day-planner-panel__dot--task" />
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {summary.rituals.length > 0 && (
                <div className="day-planner-panel__section">
                  <div className="day-planner-panel__section-title">Habits · {formatBadgeCount(summary.rituals.length)}</div>
                  {summary.rituals.map(r => (
                    <div key={r.id} className="day-planner-panel__row">
                      <span className="day-planner-panel__dot day-planner-panel__dot--ritual" />
                      <span>{r.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {summary.events.length > 0 && (
                <div className="day-planner-panel__section">
                  <div className="day-planner-panel__section-title">Events · {formatBadgeCount(summary.events.length)}</div>
                  {summary.events.map(e => (
                    <div key={e.id} className="day-planner-panel__row">
                      <span className="day-planner-panel__dot day-planner-panel__dot--event" />
                      <span>{e.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Calendar View ──────────────────────────────────────────
export default function CalendarView({
  events = [],
  upcoming = [],
  tasks = [],
  rituals = [],
  alloys = [],
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onAddUpcoming,
  onCompleteUpcoming,
  onPromoteUpcoming,
  onDeleteUpcoming,
  todayKey,
  plainLanguage = false,
}) {
  const labels = getLabels(plainLanguage)
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedKey, setSelectedKey] = useState(todayKey || toDateKey(today))
  const [showSheet, setShowSheet] = useState(false)
  const [showUpcomingSheet, setShowUpcomingSheet] = useState(false)
  const [detailEvent, setDetailEvent] = useState(null)
  const [dayPlannerOpen, setDayPlannerOpen] = useState(false)

  const dueDates = daysWithUpcoming(upcoming)
  const comingUp = getComingUpItems(upcoming, todayKey || toDateKey(today))
  const dayDue = upcomingOnDay(upcoming, selectedKey)

  function addEvent(ev) {
    onAddEvent(ev)
  }

  function deleteEvent(id) {
    onDeleteEvent(id)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const totalDays  = daysInMonth(year, month)
  const firstDay   = firstDayOfMonth(year, month)
  const prevTotal  = daysInMonth(year, month - 1 < 0 ? 11 : month - 1)

  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevTotal - i, current: false })
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, current: true })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - totalDays - firstDay + 1, current: false })
  }

  function keyForCell(cell) {
    if (!cell.current) return null
    return `${year}-${String(month+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`
  }

  // Events for selected day, sorted by hour
  const dayEvents = events
    .filter(e => eventMatchesDay(e, selectedKey))
    .sort((a, b) => a.hour - b.hour)

  const eventHours = new Set(dayEvents.map(e => e.hour))

  // Selected date label
  const selDate = new Date(selectedKey + 'T12:00:00')
  const selLabel = selDate.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Calendar</h1>
        <p className="section-subtitle">Your schedule at a glance.</p>
      </div>

      {comingUp.length > 0 && (
        <div className="coming-up-strip">
          <h3 className="coming-up-strip__title">{labels.comingUp}</h3>
          {comingUp.map(item => (
            <UpcomingRow
              key={item.id}
              item={item}
              todayKey={todayKey || toDateKey(today)}
              onComplete={onCompleteUpcoming}
              onPromote={onPromoteUpcoming}
              onDelete={onDeleteUpcoming}
            />
          ))}
        </div>
      )}

      {/* Month Nav */}
      <div className="calendar-month">
        <button className="icon-btn" onClick={prevMonth} aria-label="Previous month">
          <Icons.ChevronLeft />
        </button>
        <span className="calendar-month__label">{MONTHS[month]} {year}</span>
        <button className="icon-btn" onClick={nextMonth} aria-label="Next month">
          <Icons.ChevronRight />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="calendar-grid">
        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((cell, i) => {
          const k   = keyForCell(cell)
          const sel = k === selectedKey
          const tdy = k === todayKey
          
          const dayColors = k 
            ? Array.from(new Set(events.filter(e => eventMatchesDay(e, k)).map(e => e.color || 'blue')))
            : []
          const hasDue = k && dueDates.has(k)
          
          return (
            <div
              key={i}
              className={[
                'cal-day',
                !cell.current ? 'other-month' : '',
                tdy ? 'today' : '',
                sel ? 'selected' : '',
              ].join(' ')}
              onClick={() => { if (cell.current && k) { setSelectedKey(k); setDayPlannerOpen(false) } }}
              id={k ? `cal-day-${k}` : undefined}
            >
              {cell.day}
              {k && (dayColors.length > 0 || hasDue) && (
                <div className="cal-day-dots">
                  {dayColors.map(color => (
                    <span key={color} className={`cal-dot cal-dot--${color}`} />
                  ))}
                  {hasDue && <span className="cal-dot cal-dot--due" />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day timeline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px' }}>
        <span className="timeline-day-header">{selLabel}</span>
        <div className="calendar-day-actions">
          <button
            className="icon-btn"
            onClick={() => setShowUpcomingSheet(true)}
            style={{ background: 'var(--accent-gold)', borderColor: 'var(--accent-gold)', color: '#fff' }}
            aria-label={labels.addDeadline}
            title={labels.addDeadline}
          >
            <Icons.Calendar />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowSheet(true)}
            style={{ background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', color: '#fff' }}
            aria-label="Add event"
            id="add-event-btn"
          >
            <Icons.Plus size={14} />
          </button>
        </div>
      </div>

      <DayPlannerPanel
        dateKey={selectedKey}
        tasks={tasks}
        rituals={rituals}
        alloys={alloys}
        events={events}
        expanded={dayPlannerOpen}
        onToggle={() => setDayPlannerOpen(o => !o)}
      />

      {dayDue.length > 0 && (
        <div className="due-day-section">
          <div className="due-day-section__title">{labels.dueSection}</div>
          {dayDue.map(item => (
            <div key={item.id} className="due-item">
              <span className="due-item__name">{item.text}</span>
              <div className="upcoming-row__actions">
                <button type="button" className="upcoming-action-btn upcoming-action-btn--primary" onClick={() => onPromoteUpcoming(item.id)}>
                  Today
                </button>
                <button type="button" className="upcoming-action-btn" onClick={() => onCompleteUpcoming(item.id)}>Done</button>
                <button type="button" className="upcoming-action-btn" onClick={() => onDeleteUpcoming(item.id)} aria-label="Delete">
                  <Icons.X size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="timeline-scroll">
        {HOURS.map(h => {
          const slotEvents = dayEvents.filter(e => e.hour === h)
          const isActive   = eventHours.has(h) || slotEvents.length > 0
          if (h < 6 && !isActive) return null // hide early AM if empty

          // Collapse slot if it is spanned by an ongoing multi-hour event
          const isSpanned = dayEvents.some(e => e.hour < h && h < e.hour + (e.duration || 1))
          if (isSpanned && slotEvents.length === 0) return null

          return (
            <div key={h} className="timeline-slot">
              <div className="timeline-slot__time">{formatHour(h)}</div>
              <div className="timeline-slot__line">
                <div className="timeline-slot__dot" style={{ background: isActive ? 'var(--accent-blue)' : undefined }} />
                <div className="timeline-slot__vline" />
              </div>
              <div className="timeline-slot__content">
                {slotEvents.map(ev => {
                  const duration = ev.duration || 1
                  const endHour = ev.hour + duration
                  const timeLabel = `${formatHour(ev.hour)} – ${formatHour(endHour >= 24 ? endHour - 24 : endHour)}`
                  return (
                    <div 
                      key={ev.id} 
                      className={`event-block ${ev.color !== 'blue' ? ev.color : ''}`}
                      style={{ 
                        minHeight: `${duration * 46}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'stretch',
                        cursor: 'pointer',
                      }}
                      onClick={() => setDetailEvent(ev)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                          <div className="event-block__name">{ev.name}</div>
                          <div className="event-block__time">
                            {timeLabel}
                            {ev.repeatDays?.length ? ' · ↻ weekly' : ''}
                          </div>
                          {ev.notes?.trim() && (
                            <div className="event-block__notes-preview">{ev.notes.trim()}</div>
                          )}
                        </div>
                        <button
                          className="event-delete"
                          onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }}
                          aria-label="Delete event"
                          style={{ marginTop: -2 }}
                        >
                          <Icons.X size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {showSheet && (
        <AddEventSheet
          dateKey={selectedKey}
          onClose={() => setShowSheet(false)}
          onAdd={addEvent}
        />
      )}

      {showUpcomingSheet && (
        <AddUpcomingSheet
          dateKey={selectedKey}
          onClose={() => setShowUpcomingSheet(false)}
          onAdd={onAddUpcoming}
          labels={labels}
        />
      )}

      {detailEvent && (
        <EventDetailSheet
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onUpdate={ev => { onUpdateEvent(ev); setDetailEvent(ev) }}
          onDelete={deleteEvent}
        />
      )}
    </div>
  )
}
