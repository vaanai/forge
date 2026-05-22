// src/App.jsx
// Central App Shell managing lifted state, async Capacitor Preferences initialization, dynamic date keys, and push notifications triggers.
import { useState, useEffect, useCallback } from 'react'
import { storage, getTodayKey, getTomorrowKey, uid } from './utils/storage.js'
import { isTaskDoneOnDay, toggleTaskForDay } from './utils/recurring.js'
import { notifications, eventTimingKey } from './utils/notifications.js'
import { buildBackupPayload, downloadBackup } from './utils/backup.js'
import { registerShareListener, consumePendingShare } from './utils/shareIntent.js'
import { Icons } from './components/Icons.jsx'
import DayView      from './components/DayView.jsx'
import ProjectsView from './components/ProjectsView.jsx'
import CalendarView from './components/CalendarView.jsx'
import MetricsView  from './components/MetricsView.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import SearchSheet from './components/SearchSheet.jsx'
import JournalSheet from './components/JournalSheet.jsx'
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
  const [alloys, setAlloys] = useState([])
  const [dailyNotes, setDailyNotes] = useState({})
  const [upcoming, setUpcoming] = useState([])
  const [settings, setSettings] = useState({ plainLanguage: false })
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showJournal, setShowJournal] = useState(false)
  const [journalHighlight, setJournalHighlight] = useState(null)
  const [shareToast, setShareToast] = useState(null)
  const [saveToast, setSaveToast] = useState(null)

  const plainLanguage = settings.plainLanguage

  function showSaveError() {
    setSaveToast('Could not save changes. Please try again.')
    setTimeout(() => setSaveToast(null), 3500)
  }

  // 1. App Startup: Initialize storage cache asynchronously & load data into memory
  useEffect(() => {
    // Recover if a time-picker modal left scroll locked after HMR/crash
    document.body.style.overflow = ''

    async function startup() {
      try {
        await storage.init()
        setTheme(storage.getTheme())
        setTasks(storage.getTasks())
        setSparks(storage.getSparks())
        setProjects(storage.getProjects())
        setEvents(storage.getEvents())
        setRituals(storage.getRituals())
        setRitualLog(storage.getRitualLog())
        setAlloys(storage.getAlloys())
        setDailyNotes(storage.getDailyNotes())
        setUpcoming(storage.getUpcoming())
        setSettings(storage.getSettings())
      } catch (e) {
        console.error('[Forge] Startup failed:', e)
      } finally {
        setLoading(false)
      }
    }
    startup()
  }, [])

  const addSharedSpark = useCallback((text) => {
    const spark = { id: uid(), text, createdAt: Date.now() }
    setSparks(prev => {
      const updated = [spark, ...prev]
      storage.saveSparks(updated)
      return updated
    })
    setTab('day')
    setShareToast('Saved to Sparks')
    setTimeout(() => setShareToast(null), 2500)
  }, [])

  useEffect(() => {
    const unregister = registerShareListener(addSharedSpark)
    consumePendingShare().then(text => { if (text) addSharedSpark(text) })
    return unregister
  }, [addSharedSpark])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        consumePendingShare().then(text => { if (text) addSharedSpark(text) })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [addSharedSpark])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    storage.saveTheme(theme).catch(() => showSaveError())
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
      nId = await notifications.scheduleTask(task, todayKey)
    }
    const updated = [{ ...task, notificationId: nId }, ...tasks]
    setTasks(updated)
    try {
      await storage.saveTasks(updated)
    } catch {
      showSaveError()
    }
  }

  async function handleToggleTaskForDay(id, dateKey) {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const wasDone = isTaskDoneOnDay(task, dateKey)
    let next = toggleTaskForDay(task, dateKey)
    const nowDone = isTaskDoneOnDay(next, dateKey)

    if (!wasDone && nowDone && next.notificationId) {
      await notifications.cancel(next.notificationId)
      next = { ...next, notificationId: null }
    } else if (wasDone && !nowDone && next.reminderTime) {
      const nId = await notifications.scheduleTask(next, dateKey)
      next = { ...next, notificationId: nId }
    }

    const updated = tasks.map(t => t.id === id ? next : t)
    setTasks(updated)
    try {
      await storage.saveTasks(updated)
    } catch {
      showSaveError()
    }
  }

  async function handleDeleteTask(id) {
    const task = tasks.find(t => t.id === id)
    if (task?.notificationId) {
      await notifications.cancel(task.notificationId)
    }
    const updated = tasks.filter(t => t.id !== id)
    setTasks(updated)
    try {
      await storage.saveTasks(updated)
    } catch {
      showSaveError()
    }
  }

  async function handleDeferTask(id) {
    const tomorrowKey = getTomorrowKey()
    const updated = []

    for (const t of tasks) {
      if (t.id !== id) {
        updated.push(t)
        continue
      }
      if (t.notificationId) await notifications.cancel(t.notificationId)
      let nId = null
      if (t.reminderTime) {
        const deferred = { ...t, deferredUntil: tomorrowKey }
        nId = await notifications.scheduleTask(deferred, tomorrowKey)
      }
      updated.push({
        ...t,
        deferCount: (t.deferCount || 0) + 1,
        deferredUntil: tomorrowKey,
        notificationId: nId,
      })
    }

    setTasks(updated)
    try {
      await storage.saveTasks(updated)
    } catch {
      showSaveError()
    }
  }

  // ── Lifted Calendar Event Operations ────────────────────────
  async function handleAddEvent(ev) {
    const nResult = await notifications.scheduleCalendarEvent(ev)
    const withNotif = Array.isArray(nResult)
      ? { ...ev, notificationIds: nResult }
      : { ...ev, notificationId: nResult }
    const updated = [...events, withNotif]
    setEvents(updated)
    try {
      await storage.saveEvents(updated)
    } catch {
      showSaveError()
    }
  }

  async function handleDeleteEvent(id) {
    const ev = events.find(e => e.id === id)
    if (ev) await notifications.cancelEventNotifications(ev)
    const updated = events.filter(e => e.id !== id)
    setEvents(updated)
    try {
      await storage.saveEvents(updated)
    } catch {
      showSaveError()
    }
  }

  async function handleUpdateEvent(ev) {
    const prev = events.find(e => e.id === ev.id)
    let next = ev

    if (prev && eventTimingKey(prev) !== eventTimingKey(ev)) {
      await notifications.cancelEventNotifications(prev)
      const nResult = await notifications.scheduleCalendarEvent(ev)
      next = Array.isArray(nResult)
        ? { ...ev, notificationIds: nResult, notificationId: null }
        : { ...ev, notificationId: nResult, notificationIds: null }
    }

    const updated = events.map(e => e.id === ev.id ? next : e)
    setEvents(updated)
    try {
      await storage.saveEvents(updated)
    } catch {
      showSaveError()
    }
  }

  // ── Upcoming / deadline operations ──────────────────────────
  function handleAddUpcoming(item) {
    const updated = [...upcoming, item]
    setUpcoming(updated)
    storage.saveUpcoming(updated)
  }

  function handleCompleteUpcoming(id) {
    const updated = upcoming.map(i => i.id === id ? { ...i, done: true } : i)
    setUpcoming(updated)
    storage.saveUpcoming(updated)
  }

  function handleDeleteUpcoming(id) {
    const updated = upcoming.filter(i => i.id !== id)
    setUpcoming(updated)
    storage.saveUpcoming(updated)
  }

  async function handlePromoteUpcoming(id) {
    const item = upcoming.find(i => i.id === id)
    if (!item) return
    await handleAddTask({
      id: uid(),
      text: item.text,
      done: false,
      deferCount: 0,
      reminderTime: null,
    })
    handleCompleteUpcoming(id)
    setTab('day')
  }

  async function handleSendToToday(text) {
    await handleAddTask({
      id: uid(),
      text,
      done: false,
      deferCount: 0,
      reminderTime: null,
    })
    setTab('day')
  }

  function handleSaveDayNote(dateKey, text) {
    const updated = { ...dailyNotes, [dateKey]: text }
    setDailyNotes(updated)
    storage.saveDailyNotes(updated)
  }

  function handlePlainLanguageChange(value) {
    const next = { ...settings, plainLanguage: value }
    setSettings(next)
    storage.saveSettings(next)
  }

  async function handleExport() {
    try {
      await downloadBackup(buildBackupPayload(storage.getSnapshot()))
    } catch (e) {
      if (e?.name !== 'AbortError') showSaveError()
    }
  }

  async function handleImport(data) {
    try {
      await notifications.cancelAllFromState({ tasks, events, rituals })
      const snap = await storage.applyImport(data)
      const resynced = await notifications.resyncAfterImport(snap, todayKey)
      setTasks(resynced.tasks)
      setSparks(resynced.sparks)
      setProjects(resynced.projects)
      setEvents(resynced.events)
      setRituals(resynced.rituals)
      setRitualLog(resynced.ritualLog)
      setAlloys(resynced.alloys)
      setDailyNotes(resynced.dailyNotes)
      setUpcoming(resynced.upcoming || [])
      setSettings(resynced.settings)
      if (resynced.theme) setTheme(resynced.theme)
    } catch {
      showSaveError()
      throw new Error('Import failed')
    }
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

  // ── Lifted Alloy Operations ────────────────────────────────
  function handleCreateAlloy(all) {
    const updated = [...alloys, all]
    setAlloys(updated)
    storage.saveAlloys(updated)
  }

  function handleDeleteAlloy(id) {
    const updated = alloys.filter(a => a.id !== id)
    setAlloys(updated)
    storage.saveAlloys(updated)
  }

  function handleUpdateAlloys(updated) {
    setAlloys(updated)
    storage.saveAlloys(updated)
  }

  // ── Sync State Hooks ────────────────────────────────────────
  function handleUpdateTasks(updated) {
    setTasks(updated)
    storage.saveTasks(updated).catch(() => showSaveError())
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
            onClick={() => setShowSearch(true)}
            aria-label="Search"
            id="search-open"
          >
            <Icons.Search />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            id="settings-open"
          >
            <Icons.Settings />
          </button>
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
            onCreateRitual={handleCreateRitual}
            onDeleteRitual={handleDeleteRitual}
            ritualLog={ritualLog}
            setRitualLog={handleUpdateRitualLog}
            todayKey={todayKey}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTaskForDay}
            onDeleteTask={handleDeleteTask}
            onDeferTask={handleDeferTask}
            alloys={alloys}
            setAlloys={handleUpdateAlloys}
            onCreateAlloy={handleCreateAlloy}
            onDeleteAlloy={handleDeleteAlloy}
            plainLanguage={plainLanguage}
            dayNote={dailyNotes[todayKey] || ''}
            onSaveDayNote={handleSaveDayNote}
            dailyNotes={dailyNotes}
            onOpenPastNotes={() => { setJournalHighlight(null); setShowJournal(true) }}
            upcoming={upcoming}
            onCompleteUpcoming={handleCompleteUpcoming}
            onPromoteUpcoming={handlePromoteUpcoming}
          />
        </div>
        <div className={tab === 'projects' ? '' : 'hidden'}>
          <ProjectsView
            projects={projects}
            onUpdateProjects={handleUpdateProjects}
            onSendToToday={handleSendToToday}
            plainLanguage={plainLanguage}
          />
        </div>
        <div className={tab === 'calendar' ? '' : 'hidden'}>
          <CalendarView
            events={events}
            upcoming={upcoming}
            tasks={tasks}
            rituals={rituals}
            alloys={alloys}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onAddUpcoming={handleAddUpcoming}
            onCompleteUpcoming={handleCompleteUpcoming}
            onPromoteUpcoming={handlePromoteUpcoming}
            onDeleteUpcoming={handleDeleteUpcoming}
            todayKey={todayKey}
            plainLanguage={plainLanguage}
          />
        </div>
        <div className={tab === 'metrics' ? '' : 'hidden'}>
          <MetricsView
            tasks={tasks}
            events={events}
            rituals={rituals}
            ritualLog={ritualLog}
            alloys={alloys}
            todayKey={todayKey}
            plainLanguage={plainLanguage}
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

      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)}
          plainLanguage={plainLanguage}
          onPlainLanguageChange={handlePlainLanguageChange}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}

      {showSearch && (
        <SearchSheet
          onClose={() => setShowSearch(false)}
          tasks={tasks}
          sparks={sparks}
          projects={projects}
          events={events}
          upcoming={upcoming}
          dailyNotes={dailyNotes}
          onGoToTab={setTab}
          onOpenJournal={(dateKey) => {
            setTab('day')
            setJournalHighlight(dateKey)
            setShowJournal(true)
            setShowSearch(false)
          }}
          plainLanguage={plainLanguage}
          todayKey={todayKey}
        />
      )}

      {showJournal && (
        <JournalSheet
          dailyNotes={dailyNotes}
          highlightDateKey={journalHighlight}
          onSaveDayNote={handleSaveDayNote}
          onClose={() => { setShowJournal(false); setJournalHighlight(null) }}
          plainLanguage={plainLanguage}
        />
      )}

      {shareToast && (
        <div className="share-toast">{shareToast}</div>
      )}
      {saveToast && (
        <div className="share-toast">{saveToast}</div>
      )}
    </div>
  )
}
