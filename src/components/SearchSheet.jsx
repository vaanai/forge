import { useMemo, useState } from 'react'
import { Icons } from './Icons.jsx'
import { getTaskSearchSubtitle } from '../utils/dayPlanner.js'

function highlight(text, query) {
  if (!query) return text
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="search-mark">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}

export default function SearchSheet({
  onClose,
  tasks,
  sparks,
  projects,
  events,
  upcoming,
  dailyNotes,
  onGoToTab,
  onOpenJournal,
  plainLanguage,
  todayKey,
}) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const results = useMemo(() => {
    if (!query) return []
    const items = []

    tasks.forEach(t => {
      if (t.text?.toLowerCase().includes(query)) {
        items.push({
          type: 'task',
          tab: 'day',
          label: t.text,
          sub: getTaskSearchSubtitle(t, todayKey),
        })
      }
    })

    sparks.forEach(s => {
      if (s.text?.toLowerCase().includes(query)) {
        items.push({ type: 'spark', tab: 'day', label: s.text, sub: plainLanguage ? 'Inbox' : 'Spark' })
      }
    })

    ;(upcoming || []).forEach(u => {
      if (!u.done && u.text?.toLowerCase().includes(query)) {
        items.push({ type: 'upcoming', tab: 'calendar', label: u.text, sub: `Due · ${u.dueDate}` })
      }
    })

    projects.forEach(p => {
      if (p.archived) return
      if (p.name?.toLowerCase().includes(query) || p.tag?.toLowerCase().includes(query)) {
        items.push({ type: 'project', tab: 'projects', label: p.name, sub: p.tag || 'Project' })
      }
      if (p.scratchpad?.toLowerCase().includes(query)) {
        const snippet = p.scratchpad.slice(
          Math.max(0, p.scratchpad.toLowerCase().indexOf(query) - 20),
          Math.max(0, p.scratchpad.toLowerCase().indexOf(query) + 60
        ))
        items.push({ type: 'scratch', tab: 'projects', label: p.name, sub: `Notes: …${snippet}…` })
      }
      ;(p.tasks || []).forEach(t => {
        if (t.text?.toLowerCase().includes(query)) {
          items.push({ type: 'project-task', tab: 'projects', label: t.text, sub: `${p.name} · Task` })
        }
      })
    })

    events.forEach(e => {
      if (e.name?.toLowerCase().includes(query) || e.notes?.toLowerCase().includes(query)) {
        const when = e.dateKey || (e.repeatDays ? 'Repeating' : '')
        items.push({ type: 'event', tab: 'calendar', label: e.name, sub: `Calendar · ${when}` })
      }
    })

    Object.entries(dailyNotes || {}).forEach(([dateKey, note]) => {
      if (note?.toLowerCase().includes(query)) {
        items.push({
          type: 'note',
          tab: 'day',
          dateKey,
          label: note.slice(0, 80) + (note.length > 80 ? '…' : ''),
          sub: `Day note · ${dateKey}`,
        })
      }
    })

    return items.slice(0, 40)
  }, [query, tasks, sparks, projects, events, upcoming, dailyNotes, plainLanguage, todayKey])

  function handleSelect(r) {
    if (r.type === 'note' && onOpenJournal) {
      onOpenJournal(r.dateKey)
      return
    }
    onGoToTab(r.tab)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet search-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">Search</h2>
        <div className="input-bar" style={{ margin: '0 0 12px' }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Tasks, thoughts, projects, notes..."
            autoFocus
            autoComplete="off"
            id="global-search-input"
          />
          {q && (
            <button type="button" className="icon-btn" onClick={() => setQ('')} aria-label="Clear search">
              <Icons.X size={14} />
            </button>
          )}
        </div>

        {query && results.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
            No matches found.
          </p>
        )}

        <div className="search-results">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${i}-${r.label}`}
              type="button"
              className="search-result-row"
              onClick={() => handleSelect(r)}
            >
              <span className="search-result-row__label">{highlight(r.label, q)}</span>
              <span className="search-result-row__sub">{r.sub}</span>
            </button>
          ))}
        </div>

        <button type="button" className="sheet-btn secondary-btn" style={{ marginTop: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
