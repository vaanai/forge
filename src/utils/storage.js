// src/utils/storage.js
// Lightweight, durable native storage wrapper using Capacitor Preferences and synchronous in-memory cache.
import { Preferences } from '@capacitor/preferences'

const KEYS = {
  TASKS:       'forge_tasks',
  SPARKS:      'forge_sparks',
  PROJECTS:    'forge_projects',
  EVENTS:      'forge_events',
  RITUALS:     'forge_rituals',
  RITUAL_LOG:  'forge_ritual_log',
  THEME:       'forge_theme',
  ALLOYS:      'forge_alloys',
  DAILY_NOTES: 'forge_daily_notes',
  SETTINGS:    'forge_settings',
  UPCOMING:    'forge_upcoming',
}

const DEFAULT_SETTINGS = { plainLanguage: false }

const cache = {
  tasks: [],
  sparks: [],
  projects: [],
  events: [],
  rituals: [],
  ritualLog: {},
  theme: 'light',
  alloys: [],
  dailyNotes: {},
  settings: { ...DEFAULT_SETTINGS },
  upcoming: [],
}

async function persist(key, value) {
  await Preferences.set({ key, value })
}

export const storage = {
  async init() {
    const keysArray = Object.values(KEYS)
    const fetches = keysArray.map(key => Preferences.get({ key }))
    const results = await Promise.all(fetches)

    const loadKey = (index, storageKey, fallbackValue) => {
      const prefVal = results[index].value
      if (prefVal !== null) {
        try {
          return JSON.parse(prefVal)
        } catch {
          return prefVal
        }
      }

      const localVal = localStorage.getItem(storageKey)
      if (localVal !== null) {
        try {
          return JSON.parse(localVal)
        } catch {
          return localVal
        }
      }

      return fallbackValue
    }

    cache.tasks = loadKey(0, KEYS.TASKS, [])
    cache.sparks = loadKey(1, KEYS.SPARKS, [])
    cache.projects = loadKey(2, KEYS.PROJECTS, [])
    cache.events = loadKey(3, KEYS.EVENTS, [])
    cache.rituals = loadKey(4, KEYS.RITUALS, [])
    cache.ritualLog = loadKey(5, KEYS.RITUAL_LOG, {})
    cache.theme = results[6].value !== null ? results[6].value : (localStorage.getItem(KEYS.THEME) || 'light')
    cache.alloys = loadKey(7, KEYS.ALLOYS, [])
    cache.dailyNotes = loadKey(8, KEYS.DAILY_NOTES, {})
    cache.settings = { ...DEFAULT_SETTINGS, ...loadKey(9, KEYS.SETTINGS, DEFAULT_SETTINGS) }
    cache.upcoming = loadKey(10, KEYS.UPCOMING, [])

    const migrations = []
    for (let i = 0; i < keysArray.length; i++) {
      if (results[i].value !== null) continue
      const localVal = localStorage.getItem(keysArray[i])
      if (localVal !== null) migrations.push(persist(keysArray[i], localVal))
    }
    if (results[6].value === null && localStorage.getItem(KEYS.THEME)) {
      migrations.push(persist(KEYS.THEME, cache.theme))
    }
    await Promise.all(migrations)
  },

  async applyImport(data) {
    if (data.tasks !== undefined) { cache.tasks = data.tasks; await storage.saveTasks(data.tasks) }
    if (data.sparks !== undefined) { cache.sparks = data.sparks; await storage.saveSparks(data.sparks) }
    if (data.projects !== undefined) { cache.projects = data.projects; await storage.saveProjects(data.projects) }
    if (data.events !== undefined) { cache.events = data.events; await storage.saveEvents(data.events) }
    if (data.rituals !== undefined) { cache.rituals = data.rituals; await storage.saveRituals(data.rituals) }
    if (data.ritualLog !== undefined) { cache.ritualLog = data.ritualLog; await storage.saveRitualLog(data.ritualLog) }
    if (data.alloys !== undefined) { cache.alloys = data.alloys; await storage.saveAlloys(data.alloys) }
    if (data.dailyNotes !== undefined) { cache.dailyNotes = data.dailyNotes; await storage.saveDailyNotes(data.dailyNotes) }
    if (data.upcoming !== undefined) { cache.upcoming = data.upcoming; await storage.saveUpcoming(data.upcoming) }
    if (data.settings !== undefined) { cache.settings = { ...DEFAULT_SETTINGS, ...data.settings }; await storage.saveSettings(cache.settings) }
    if (data.theme !== undefined) { cache.theme = data.theme; await storage.saveTheme(data.theme) }
    return { ...cache }
  },

  getSnapshot() {
    return {
      tasks: cache.tasks,
      sparks: cache.sparks,
      projects: cache.projects,
      events: cache.events,
      rituals: cache.rituals,
      ritualLog: cache.ritualLog,
      alloys: cache.alloys,
      theme: cache.theme,
      dailyNotes: cache.dailyNotes,
      upcoming: cache.upcoming,
      settings: cache.settings,
    }
  },

  getTasks: () => cache.tasks,
  saveTasks: async (arr) => {
    cache.tasks = arr
    await persist(KEYS.TASKS, JSON.stringify(arr))
  },

  getSparks: () => cache.sparks,
  saveSparks: async (arr) => {
    cache.sparks = arr
    await persist(KEYS.SPARKS, JSON.stringify(arr))
  },

  getProjects: () => cache.projects,
  saveProjects: async (arr) => {
    cache.projects = arr
    await persist(KEYS.PROJECTS, JSON.stringify(arr))
  },

  getEvents: () => cache.events,
  saveEvents: async (arr) => {
    cache.events = arr
    await persist(KEYS.EVENTS, JSON.stringify(arr))
  },

  getRituals: () => cache.rituals,
  saveRituals: async (arr) => {
    cache.rituals = arr
    await persist(KEYS.RITUALS, JSON.stringify(arr))
  },

  getRitualLog: () => cache.ritualLog,
  saveRitualLog: async (log) => {
    cache.ritualLog = log
    await persist(KEYS.RITUAL_LOG, JSON.stringify(log))
  },

  getAlloys: () => cache.alloys,
  saveAlloys: async (arr) => {
    cache.alloys = arr
    await persist(KEYS.ALLOYS, JSON.stringify(arr))
  },

  getDailyNotes: () => cache.dailyNotes,
  saveDailyNotes: async (notes) => {
    cache.dailyNotes = notes
    await persist(KEYS.DAILY_NOTES, JSON.stringify(notes))
  },

  getUpcoming: () => cache.upcoming,
  saveUpcoming: async (arr) => {
    cache.upcoming = arr
    await persist(KEYS.UPCOMING, JSON.stringify(arr))
  },

  getSettings: () => cache.settings,
  saveSettings: async (settings) => {
    cache.settings = { ...DEFAULT_SETTINGS, ...settings }
    await persist(KEYS.SETTINGS, JSON.stringify(cache.settings))
  },

  getTheme: () => cache.theme,
  saveTheme: async (t) => {
    cache.theme = t
    await persist(KEYS.THEME, t)
  },
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
