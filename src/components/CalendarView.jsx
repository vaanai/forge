import { useState, useEffect } from 'react'
import { storage, uid } from '../utils/storage.js'
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
  const [hour,  setHour]  = useState(8)
  const [duration, setDuration] = useState(1)
  const [color, setColor] = useState('blue')

  function submit(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    onAdd({ id: uid(), dateKey, name: n, hour: Number(hour), duration: Number(duration), color })
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

          <button className="sheet-btn" type="submit">Add Event</button>
        </form>
      </div>
    </div>
  )
}

// ── Calendar View ──────────────────────────────────────────
export default function CalendarView({ events = [], onAddEvent, onDeleteEvent, todayKey }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedKey, setSelectedKey] = useState(todayKey || toDateKey(today))
  const [showSheet, setShowSheet] = useState(false)

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
    .filter(e => e.dateKey === selectedKey)
    .sort((a, b) => a.hour - b.hour)

  // Hours that have events (for timeline indicator)
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
            ? Array.from(new Set(events.filter(e => e.dateKey === k).map(e => e.color || 'blue')))
            : []
          
          return (
            <div
              key={i}
              className={[
                'cal-day',
                !cell.current ? 'other-month' : '',
                tdy ? 'today' : '',
                sel ? 'selected' : '',
              ].join(' ')}
              onClick={() => { if (cell.current && k) setSelectedKey(k) }}
              id={k ? `cal-day-${k}` : undefined}
            >
              {cell.day}
              {k && dayColors.length > 0 && (
                <div className="cal-day-dots">
                  {dayColors.map(color => (
                    <span key={color} className={`cal-dot cal-dot--${color}`} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day timeline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px' }}>
        <span className="timeline-day-header">{selLabel}</span>
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
                        alignItems: 'stretch'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                          <div className="event-block__name">{ev.name}</div>
                          <div className="event-block__time">{timeLabel}</div>
                        </div>
                        <button className="event-delete" onClick={() => deleteEvent(ev.id)} aria-label="Delete event" style={{ marginTop: -2 }}>
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
    </div>
  )
}
