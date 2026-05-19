// src/utils/storage.js
// Lightweight local-storage wrapper for all Forge data

const KEYS = {
  TASKS:    'forge_tasks',
  SPARKS:   'forge_sparks',
  PROJECTS: 'forge_projects',
  EVENTS:   'forge_events',
  THEME:    'forge_theme',
}

function load(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export const storage = {
  // Tasks (The Day)
  getTasks:    ()    => load(KEYS.TASKS, []),
  saveTasks:   (arr) => save(KEYS.TASKS, arr),

  // Sparks inbox
  getSparks:   ()    => load(KEYS.SPARKS, []),
  saveSparks:  (arr) => save(KEYS.SPARKS, arr),

  // Projects
  getProjects: ()    => load(KEYS.PROJECTS, []),
  saveProjects:(arr) => save(KEYS.PROJECTS, arr),

  // Calendar Events
  getEvents:   ()    => load(KEYS.EVENTS, []),
  saveEvents:  (arr) => save(KEYS.EVENTS, arr),

  // Theme
  getTheme:    ()    => load(KEYS.THEME, 'light'),
  saveTheme:   (t)   => save(KEYS.THEME, t),
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getTodayKey() {
  return toDateKey(new Date())
}

export function getTomorrowKey() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toDateKey(tomorrow)
}

