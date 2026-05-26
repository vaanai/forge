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
  onNavigate,
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
          taskId: t.id,
          label: t.text,
          sub: getTaskSearchSubtitle(t, todayKey),
        })
      }
    })

    sparks.forEach(s => {
      if (s.text?.toLowerCase().includes(query)) {
        items.push({
          type: 'spark',
          tab: 'day',
          sparkId: s.id,
          label: s.text,
          sub: plainLanguage ? 'Inbox' : 'Spark',
        })
      }
    })

    ;(upcoming || []).forEach(u => {
      if (!u.done && u.text?.toLowerCase().includes(query)) {
        items.push({
          type: 'upcoming',
          tab: 'calendar',
          upcomingId: u.id,
          calendarDateKey: u.dueDate,
          label: u.text,
          sub: `Due · ${u.dueDate}`,
        })
      }
    })

    projects.forEach(p => {
      if (p.archived) return
      if (p.name?.toLowerCase().includes(query) || p.tag?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)) {
        items.push({ type: 'project', tab: 'projects', projectId: p.id, label: p.name, sub: p.tag || 'Project' })
      }
      ;(p.notebook || []).forEach(page => {
        if (page.content?.toLowerCase().includes(query) || page.title?.toLowerCase().includes(query)) {
          const snippet = (page.content || '').slice(
            Math.max(0, (page.content || '').toLowerCase().indexOf(query) - 20),
            Math.max(0, (page.content || '').toLowerCase().indexOf(query) + 60)
          )
          items.push({
            type: 'notes',
            tab: 'projects',
            projectId: p.id,
            openNotes: true,
            label: `${p.name} · ${page.title || 'Notes'}`,
            sub: `Notes: …${snippet}…`,
          })
        }
      })
      if (p.scratchpad?.toLowerCase().includes(query) && !(p.notebook || []).some(pg => pg.content?.toLowerCase().includes(query))) {
        const snippet = p.scratchpad.slice(
          Math.max(0, p.scratchpad.toLowerCase().indexOf(query) - 20),
          Math.max(0, p.scratchpad.toLowerCase().indexOf(query) + 60)
        )
        items.push({
          type: 'notes',
          tab: 'projects',
          projectId: p.id,
          openNotes: true,
          label: p.name,
          sub: `Notes: …${snippet}…`,
        })
      }
      ;(p.tasks || []).forEach(t => {
        if (t.text?.toLowerCase().includes(query)) {
          items.push({
            type: 'project-task',
            tab: 'projects',
            projectId: p.id,
            taskId: t.id,
            label: t.text,
            sub: `${p.name} · Task`,
          })
        }
      })
      ;(p.ideas || []).forEach(idea => {
        if (idea.text?.toLowerCase().includes(query)) {
          items.push({
            type: 'project-idea',
            tab: 'projects',
            projectId: p.id,
            label: idea.text,
            sub: `${p.name} · ${plainLanguage ? 'Thought' : 'Spark'}`,
          })
        }
      })
    })

    events.forEach(e => {
      if (e.name?.toLowerCase().includes(query) || e.notes?.toLowerCase().includes(query)) {
        const when = e.dateKey || (e.repeatDays ? 'Repeating' : '')
        items.push({
          type: 'event',
          tab: 'calendar',
          eventId: e.id,
          calendarDateKey: e.dateKey || todayKey,
          label: e.name,
          sub: `Calendar · ${when}`,
        })
      }
    })

    Object.entries(dailyNotes || {}).forEach(([dateKey, note]) => {
      if (note?.toLowerCase().includes(query)) {
        items.push({
          type: 'note',
          tab: 'day',
          dateKey,
          expandDayNote: dateKey === todayKey,
          label: note.slice(0, 80) + (note.length > 80 ? '…' : ''),
          sub: `Day note · ${dateKey}`,
        })
      }
    })

    return items.slice(0, 40)
  }, [query, tasks, sparks, projects, events, upcoming, dailyNotes, plainLanguage, todayKey])

  function handleSelect(r) {
    if (r.type === 'note' && r.dateKey !== todayKey && onOpenJournal) {
      onOpenJournal(r.dateKey)
      return
    }
    onNavigate({
      tab: r.tab,
      projectId: r.projectId,
      openNotes: r.openNotes,
      taskId: r.taskId,
      sparkId: r.sparkId,
      eventId: r.eventId,
      calendarDateKey: r.calendarDateKey,
      upcomingId: r.upcomingId,
      expandDayNote: r.expandDayNote,
    })
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
