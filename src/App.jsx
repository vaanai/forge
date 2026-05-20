// src/App.jsx
// Central App Shell managing lifted state, async Capacitor Preferences initialization, dynamic date keys, and push notifications triggers.
import { useState, useEffect } from 'react'
import { storage, getTodayKey } from './utils/storage.js'
import { notifications } from './utils/notifications.js'
import { Icons } from './components/Icons.jsx'
import DayView      from './components/DayView.jsx'
import ProjectsView from './components/ProjectsView.jsx'
import CalendarView from './components/CalendarView.jsx'
import MetricsView  from './components/MetricsView.jsx'
import './index.css'

// Custom minimalist SVG Chart icon for Metrics
const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

const TABS = [
  { id: 'day',      label: 'Today',    Icon: Icons.Day      },
  { id: 'projects', label: 'Projects', Icon: Icons.Projects },
  { id: 'calendar', label: 'Calendar', Icon: Icons.Calendar },
  { id: 'metrics',  label: 'Metrics',  Icon: ChartIcon      },
]

export default function App() {
  const [tab, setTab] = useState('day')
  const [theme, setTheme] = useState('light')
  const [loading, setLoading] = useState(true)
  const [todayKey, setTodayKey] = useState(getTodayKey())

  // Lifted entity states
  const [tasks, setTasks] = useState([])
  const [sparks, setSparks] = useState([])
  const [projects, setProjects] = useState([])
  const [events, setEvents] = useState([])
  const [rituals, setRituals] = useState([])
  const [ritualLog, setRitualLog] = useState({})

  // 1. App Startup: Initialize storage cache asynchronously & load data into memory
  useEffect(() => {
    async function startup() {
      await storage.init()
      setTheme(storage.getTheme())
      setTasks(storage.getTasks())
      setSparks(storage.getSparks())
      setProjects(storage.getProjects())
      setEvents(storage.getEvents())
      setRituals(storage.getRituals())
      setRitualLog(storage.getRitualLog())
      setLoading(false)

      // Request notification permissions
      await notifications.requestPermission()
    }
    startup()
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    storage.saveTheme(theme)
  }, [theme])

  // 2. Dynamic Date Refresh: Foreground listeners to refresh date key
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        setTodayKey(getTodayKey())
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  function toggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  // ── Lifted Task Operations ──────────────────────────────────
  async function handleAddTask(task) {
    let nId = null
    if (task.reminderTime) {
      nId = await notifications.scheduleTask(task)
    }
    const updated = [{ ...task, notificationId: nId }, ...tasks]
    setTasks(updated)
    storage.saveTasks(updated)
  }

  function handleToggleTask(id) {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextDone = !t.done
        // Cancel notification if completed, reschedule if uncompleted and has alert time
        if (nextDone && t.notificationId) {
          notifications.cancel(t.notificationId)
          return { ...t, done: true, notificationId: null }
        }
        return { ...t, done: nextDone }
      }
      return t
    })
    setTasks(updated)
    storage.saveTasks(updated)
  }

  function handleDeleteTask(id) {
    const task = tasks.find(t => t.id === id)
    if (task && task.notificationId) {
      notifications.cancel(task.notificationId)
    }
    const updated = tasks.filter(t => t.id !== id)
    setTasks(updated)
    storage.saveTasks(updated)
  }

  // ── Lifted Calendar Event Operations ────────────────────────
  async function handleAddEvent(ev) {
    const nId = await notifications.scheduleCalendarEvent(ev)
    const updated = [...events, { ...ev, notificationId: nId }]
    setEvents(updated)
    storage.saveEvents(updated)
  }

  function handleDeleteEvent(id) {
    const ev = events.find(e => e.id === id)
    if (ev && ev.notificationId) {
      notifications.cancel(ev.notificationId)
    }
    const updated = events.filter(e => e.id !== id)
    setEvents(updated)
    storage.saveEvents(updated)
  }

  // ── Lifted Ritual Operations ──────────────────────────────
  async function handleCreateRitual(rit) {
    const nIds = await notifications.scheduleRitual(rit)
    const updated = [...rituals, { ...rit, notificationIds: nIds }]
    setRituals(updated)
    storage.saveRituals(updated)
  }

  function handleDeleteRitual(id) {
    const rit = rituals.find(r => r.id === id)
    if (rit && rit.notificationIds) {
      notifications.cancelMultiple(rit.notificationIds)
    }
    const updated = rituals.filter(r => r.id !== id)
    setRituals(updated)
    storage.saveRituals(updated)
  }

  // ── Sync State Hooks ────────────────────────────────────────
  function handleUpdateTasks(updated) {
    setTasks(updated)
    storage.saveTasks(updated)
  }

  function handleUpdateSparks(updated) {
    setSparks(updated)
    storage.saveSparks(updated)
  }

  function handleUpdateProjects(updated) {
    setProjects(updated)
    storage.saveProjects(updated)
  }

  function handleUpdateRitualLog(updated) {
    setRitualLog(updated)
    storage.saveRitualLog(updated)
  }

  // Loading Splash Screen
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{ fontSize: '28px', fontStyle: 'italic', fontFamily: 'var(--font-serif)', marginBottom: '16px' }}>
          For<span style={{ color: 'var(--accent-gold)' }}>ge</span>
        </div>
        <div className="forge-meter-track" style={{ width: '120px', height: '4px' }}>
          <div className="forge-meter-fill ignited" style={{ width: '100%', animation: 'fadeIn 1s infinite' }} />
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '12px', letterSpacing: '1px' }}>
          Igniting Slate...
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="top-bar">
        <span className="top-bar__wordmark">
          For<span>ge</span>
        </span>
        <div className="top-bar__actions">
          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            id="theme-toggle"
          >
            {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
          </button>
        </div>
      </header>

      {/* Main Content (Keeping views mounted with .hidden toggles to preserve layout & focus states) */}
      <main className="view-content" id="view-content">
        <div className={tab === 'day' ? '' : 'hidden'}>
          <DayView
            tasks={tasks}
            setTasks={handleUpdateTasks}
            sparks={sparks}
            setSparks={handleUpdateSparks}
            projects={projects}
            setProjects={handleUpdateProjects}
            events={events}
            rituals={rituals}
            setRituals={setRituals}
            ritualLog={ritualLog}
            setRitualLog={handleUpdateRitualLog}
            todayKey={todayKey}
            onAddTask={handleAddTask}
          />
        </div>
        <div className={tab === 'projects' ? '' : 'hidden'}>
          <ProjectsView
            projects={projects}
            onUpdateProjects={handleUpdateProjects}
          />
        </div>
        <div className={tab === 'calendar' ? '' : 'hidden'}>
          <CalendarView
            events={events}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
            todayKey={todayKey}
          />
        </div>
        <div className={tab === 'metrics' ? '' : 'hidden'}>
          <MetricsView
            tasks={tasks}
            events={events}
            rituals={rituals}
            ritualLog={ritualLog}
          />
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
            id={`nav-${id}`}
            aria-label={label}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
