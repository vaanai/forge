import { useState, useEffect } from 'react'
import { storage } from './utils/storage.js'
import { Icons } from './components/Icons.jsx'
import DayView      from './components/DayView.jsx'
import ProjectsView from './components/ProjectsView.jsx'
import CalendarView from './components/CalendarView.jsx'
import './index.css'

const TABS = [
  { id: 'day',      label: 'Today',    Icon: Icons.Day      },
  { id: 'projects', label: 'Projects', Icon: Icons.Projects },
  { id: 'calendar', label: 'Calendar', Icon: Icons.Calendar },
]

export default function App() {
  const [tab,   setTab]   = useState('day')
  const [theme, setTheme] = useState(() => storage.getTheme())

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    storage.saveTheme(theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light')
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

      {/* Main Content */}
      <main className="view-content" id="view-content">
        {tab === 'day'      && <DayView />}
        {tab === 'projects' && <ProjectsView />}
        {tab === 'calendar' && <CalendarView />}
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
